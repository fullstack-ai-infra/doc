import { randomUUID } from 'node:crypto'

const appBase = normalizedBase(process.env.DOC_VERIFY_APP_URL || 'http://127.0.0.1:3100')
const mailpitBase = normalizedBase(process.env.DOC_VERIFY_MAILPIT_URL || 'http://127.0.0.1:8025')
const email = process.env.DOC_VERIFY_EMAIL || 'doc-local-loop@example.test'
const keepDocument = process.env.DOC_VERIFY_KEEP_DOCUMENT === '1'
const timeoutMs = Number(process.env.DOC_VERIFY_TIMEOUT_MS || 30_000)
const cookieJar = new Map()

function normalizedBase(value) {
  return value.replace(/\/$/, '')
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

function rememberCookies(response) {
  for (const value of response.headers.getSetCookie()) {
    const pair = value.split(';', 1)[0]
    const separator = pair.indexOf('=')
    if (separator > 0) cookieJar.set(pair.slice(0, separator), pair.slice(separator + 1))
  }
}

function cookieHeader() {
  return [...cookieJar].map(([name, value]) => `${name}=${value}`).join('; ')
}

async function appFetch(path, options = {}) {
  const headers = new Headers(options.headers)
  const cookies = cookieHeader()
  if (cookies) headers.set('cookie', cookies)
  const response = await fetch(`${appBase}${path}`, { ...options, headers })
  rememberCookies(response)
  return response
}

async function readJson(response, label) {
  assert(response.ok, `${label} returned HTTP ${response.status}`)
  try {
    return await response.json()
  } catch {
    throw new Error(`${label} did not return JSON`)
  }
}

async function readDocApi(response, label) {
  const payload = await readJson(response, label)
  assert(payload?.errno === 0, `${label} returned application error ${payload?.errno ?? 'unknown'}`)
  return payload.data
}

async function listMailpitMessages() {
  const response = await fetch(`${mailpitBase}/api/v1/messages?limit=100`)
  const payload = await readJson(response, 'Mailpit messages')
  return Array.isArray(payload?.messages) ? payload.messages : []
}

function messageId(message) {
  return String(message?.ID ?? message?.Id ?? message?.id ?? '')
}

function messageTargetsEmail(message) {
  const recipients = message?.To ?? message?.to ?? []
  return JSON.stringify(recipients).toLowerCase().includes(email.toLowerCase())
}

async function waitForNewMessage(previousIds) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const message = (await listMailpitMessages()).find(
      (candidate) => !previousIds.has(messageId(candidate)) && messageTargetsEmail(candidate)
    )
    if (message) return message
    await delay(500)
  }
  throw new Error('Mailpit did not receive the sign-in email before the verification timeout')
}

function collectStrings(value, output = []) {
  if (typeof value === 'string') output.push(value)
  else if (Array.isArray(value)) value.forEach((item) => collectStrings(item, output))
  else if (value && typeof value === 'object') Object.values(value).forEach((item) => collectStrings(item, output))
  return output
}

function decodeHtml(value) {
  return value.replaceAll('&amp;', '&').replaceAll('&quot;', '"').replaceAll('&#x27;', "'").replaceAll('&#39;', "'")
}

function extractMagicLink(message) {
  const content = decodeHtml(collectStrings(message).join('\n'))
  const match = content.match(/https?:\/\/[^\s"'<>]+\/api\/auth\/callback\/(?:nodemailer|resend)[^\s"'<>]*/i)
  assert(match, 'Mailpit message did not contain an Auth.js email callback')
  const callback = new URL(match[0])
  return `${callback.pathname}${callback.search}`
}

async function authenticateThroughMailpit() {
  const previousIds = new Set((await listMailpitMessages()).map(messageId))
  const csrf = await readJson(await appFetch('/api/auth/csrf'), 'Auth.js CSRF endpoint')
  assert(typeof csrf?.csrfToken === 'string' && csrf.csrfToken, 'Auth.js did not issue a CSRF token')

  const signin = await appFetch('/api/auth/signin/nodemailer', {
    method: 'POST',
    redirect: 'manual',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      'x-auth-return-redirect': '1',
    },
    body: new URLSearchParams({ csrfToken: csrf.csrfToken, email, callbackUrl: `${appBase}/` }),
  })
  assert(signin.status < 400, `Auth.js sign-in request returned HTTP ${signin.status}`)

  const summary = await waitForNewMessage(previousIds)
  const detail = await readJson(
    await fetch(`${mailpitBase}/api/v1/message/${encodeURIComponent(messageId(summary))}`),
    'Mailpit message'
  )
  const callbackPath = extractMagicLink(detail)
  const callback = await appFetch(callbackPath, { redirect: 'manual' })
  assert(callback.status >= 200 && callback.status < 400, `Auth.js callback returned HTTP ${callback.status}`)

  const session = await readJson(await appFetch('/api/auth/session'), 'Auth.js session endpoint')
  assert(
    session?.user?.email?.toLowerCase() === email.toLowerCase(),
    'Authenticated session did not match the test email'
  )
}

async function verifyDocumentPersistence() {
  const marker = `local-loop-${randomUUID()}`
  const initialTitle = `doc local loop ${marker}`
  const updatedTitle = `${initialTitle} updated`
  const content = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: marker }] }] }
  let id

  try {
    const created = await readDocApi(
      await appFetch('/api/doc', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title: initialTitle, content }),
      }),
      'Create document'
    )
    id = created?.id
    assert(typeof id === 'string' && id, 'Create document did not return an id')

    await readDocApi(
      await appFetch(`/api/doc/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title: updatedTitle }),
      }),
      'Update document'
    )

    const reloaded = await readDocApi(await appFetch(`/api/doc/${encodeURIComponent(id)}`), 'Reload document')
    assert(
      typeof reloaded?.content === 'string' && reloaded.content.includes(marker),
      'Reloaded content lost its marker'
    )

    const matching = await readDocApi(
      await appFetch(`/api/doc?keyword=${encodeURIComponent(updatedTitle)}`),
      'Search updated document'
    )
    assert(
      Array.isArray(matching) && matching.some((document) => document?.id === id && document?.title === updatedTitle),
      'Updated title was not persisted'
    )
    return id
  } catch (error) {
    if (id && !keepDocument) await cleanupDocument(id).catch(() => {})
    throw error
  }
}

async function cleanupDocument(id) {
  await readDocApi(
    await appFetch('/api/doc', {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ids: [id] }),
    }),
    'Clean up document'
  )
}

async function main() {
  await authenticateThroughMailpit()
  const documentId = await verifyDocumentPersistence()
  if (!keepDocument) await cleanupDocument(documentId)
  console.log(
    JSON.stringify({
      authenticated: true,
      emailCaptured: true,
      documentCreated: true,
      documentUpdated: true,
      persistedAfterReload: true,
      cleanedUp: !keepDocument,
    })
  )
}

main().catch((error) => {
  console.error(`Local loop verification failed: ${error.message}`)
  process.exitCode = 1
})
