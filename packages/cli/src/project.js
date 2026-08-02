import { randomBytes } from 'node:crypto'
import { access, chmod, lstat, mkdir, readFile, realpath, rename, unlink, writeFile } from 'node:fs/promises'
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { hasUsableAuthPath } from './auth-config.js'

const PROJECT_PACKAGE = '@fullstack-ai-infra/doc'
const INSTANCE_DIRECTORY = '.doc'
const INSTANCE_FILE = 'instance-id'
const SECRET_PLACEHOLDERS = new Set([
  '',
  'xxx',
  'local-collaboration-token',
  'local-internal-token',
  'replace-with-a-random-secret',
  'replace-with-a-shared-token-key',
  'replace-with-an-internal-service-key',
])

export class ProjectConfigurationError extends Error {}

async function exists(path) {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

async function isProjectRoot(path) {
  try {
    const packageJson = JSON.parse(await readFile(join(path, 'package.json'), 'utf8'))
    return (
      packageJson.name === PROJECT_PACKAGE &&
      (await exists(join(path, 'docker-compose.yml'))) &&
      (await exists(join(path, 'prisma', 'schema.prisma')))
    )
  } catch {
    return false
  }
}

export async function resolveProjectRoot(startDirectory, explicitRoot) {
  if (explicitRoot) {
    const candidate = resolve(startDirectory, explicitRoot)
    if (!(await isProjectRoot(candidate))) {
      throw new Error(`Not a doc project: ${candidate}`)
    }
    return realpath(candidate)
  }

  let candidate = resolve(startDirectory)
  while (true) {
    if (await isProjectRoot(candidate)) return realpath(candidate)
    const parent = dirname(candidate)
    if (parent === candidate) break
    candidate = parent
  }

  throw new Error('No doc project found. Run this command inside a doc checkout or pass --root <path>.')
}

export function parseEnv(content) {
  const values = {}
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
    if (!match) continue
    let value = match[2]
    if (
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))
    ) {
      value = value.slice(1, -1)
    }
    values[match[1]] = value
  }
  return values
}

export async function readEnv(path) {
  return parseEnv(await readFile(path, 'utf8'))
}

export function isConfiguredSecret(value) {
  return typeof value === 'string' && value.trim().length >= 32 && !SECRET_PLACEHOLDERS.has(value.trim())
}

function replaceEnvValue(content, key, value) {
  const line = `${key}=${value}`
  const pattern = new RegExp(`^\\s*(?:export\\s+)?${key}\\s*=.*$`, 'gm')
  const withoutExistingValues = content.replace(pattern, '').replace(/\n{3,}/g, '\n\n')
  return `${withoutExistingValues.trimEnd()}\n${line}\n`
}

function ensureEnvValue(content, key, value) {
  return parseEnv(content)[key] === value ? content : replaceEnvValue(content, key, value)
}

const LOCAL_SMTP_KEYS = new Set([
  'EMAIL_FROM',
  'EMAIL_HOST',
  'EMAIL_PORT',
  'EMAIL_CONTAINER_HOST',
  'EMAIL_CONTAINER_PORT',
  'EMAIL_USERNAME',
  'EMAIL_PASSWORD',
  'EMAIL_SECURE',
])

function usesLocalSmtp(values) {
  const host = values.EMAIL_HOST?.trim().toLowerCase()
  return ['localhost', '127.0.0.1', '::1', '[::1]', 'mailpit'].includes(host)
}

function mergeMissingEnvValues(content, template, { includeLocalSmtp = true } = {}) {
  const existingValues = parseEnv(content)
  let result = content
  for (const [key, value] of Object.entries(parseEnv(template))) {
    if (Object.hasOwn(existingValues, key)) continue
    if (!includeLocalSmtp && LOCAL_SMTP_KEYS.has(key)) continue
    result = replaceEnvValue(result, key, value)
  }
  return result
}

function applyLegacyLocalSmtpDefaults(content, template, originalValues) {
  const templateValues = parseEnv(template)
  let result = content
  for (const key of LOCAL_SMTP_KEYS) {
    const current = parseEnv(result)[key]
    if ((current === undefined || current.trim() === '') && templateValues[key]?.trim()) {
      result = replaceEnvValue(result, key, templateValues[key])
    }
  }

  const legacyBlankSmtp =
    !originalValues.EMAIL_FROM?.trim() &&
    !originalValues.EMAIL_HOST?.trim() &&
    !originalValues.EMAIL_USERNAME?.trim() &&
    !originalValues.EMAIL_USER?.trim() &&
    !originalValues.EMAIL_PASSWORD?.trim() &&
    (!originalValues.EMAIL_PORT || originalValues.EMAIL_PORT === '587')
  if (legacyBlankSmtp) result = replaceEnvValue(result, 'EMAIL_PORT', templateValues.EMAIL_PORT)
  return result
}

function generatedSecret() {
  return randomBytes(32).toString('base64url')
}

async function writePrivateFile(path, content, overwrite) {
  if (!overwrite) {
    await writeFile(path, content, { encoding: 'utf8', mode: 0o600, flag: 'wx' })
    await chmod(path, 0o600)
    return
  }

  const temporaryPath = `${path}.tmp-${process.pid}-${randomBytes(6).toString('hex')}`
  try {
    await writeFile(temporaryPath, content, { encoding: 'utf8', mode: 0o600, flag: 'wx' })
    await chmod(temporaryPath, 0o600)
    await rename(temporaryPath, path)
  } catch (error) {
    try {
      await unlink(temporaryPath)
    } catch {}
    throw error
  }
}

function pathIsInside(root, path) {
  const pathFromRoot = relative(root, path)
  return (
    pathFromRoot === '' || (pathFromRoot !== '..' && !pathFromRoot.startsWith(`..${sep}`) && !isAbsolute(pathFromRoot))
  )
}

async function rejectSymlink(path, label) {
  try {
    if ((await lstat(path)).isSymbolicLink()) {
      throw new ProjectConfigurationError(`${label} must not be a symbolic link: ${path}`)
    }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
}

export async function resolveWritableEnvPath(root, envFile) {
  if (!envFile) {
    const defaultPath = join(root, '.env')
    await rejectSymlink(defaultPath, 'Environment file')
    return defaultPath
  }
  if (isAbsolute(envFile)) {
    throw new ProjectConfigurationError('doc init requires --env-file to be relative to the project root')
  }

  const candidate = resolve(root, envFile)
  const filename = basename(candidate)
  if (!pathIsInside(root, candidate) || !filename.startsWith('.env') || filename.endsWith('.example')) {
    throw new ProjectConfigurationError('doc init only writes non-example .env* files inside the project root')
  }

  const realParent = await realpath(dirname(candidate))
  if (!pathIsInside(root, realParent)) {
    throw new ProjectConfigurationError('doc init environment path resolves outside the project root')
  }
  await rejectSymlink(candidate, 'Environment file')
  return candidate
}

function validEnvironmentPair(rootValues, collaborationValues) {
  const secrets = [rootValues.AUTH_SECRET, rootValues.COLLABORATE_API_AUTH_KEY, rootValues.COLLABORATE_INTERNAL_API_KEY]
  return (
    secrets.every(isConfiguredSecret) &&
    new Set(secrets).size === secrets.length &&
    rootValues.DATABASE_URL &&
    collaborationValues.DATABASE_URL &&
    collaborationValues.API_AUTH_KEY === rootValues.COLLABORATE_API_AUTH_KEY &&
    collaborationValues.INTERNAL_API_KEY === rootValues.COLLABORATE_INTERNAL_API_KEY
  )
}

async function ensureInstanceId(root, dryRun) {
  const directory = join(root, INSTANCE_DIRECTORY)
  const path = join(directory, INSTANCE_FILE)
  await rejectSymlink(directory, 'Instance directory')
  await rejectSymlink(path, 'Instance identity')

  if (await exists(path)) {
    const value = (await readFile(path, 'utf8')).trim()
    if (!/^[a-f0-9]{20}$/.test(value)) {
      throw new ProjectConfigurationError(`${path} does not contain a valid doc instance identity`)
    }
    if (!dryRun) await chmod(path, 0o600)
    return { path, created: false }
  }

  if (!dryRun) {
    await mkdir(directory, { recursive: true, mode: 0o700 })
    await chmod(directory, 0o700)
    await writePrivateFile(path, `${randomBytes(10).toString('hex')}\n`, false)
  }
  return { path, created: true }
}

export async function initializeEnvironment(root, options = {}) {
  const rootTemplatePath = join(root, '.env.example')
  const rootEnvPath = await resolveWritableEnvPath(root, options.envFile)
  const collaborationTemplatePath = join(root, 'services', 'collaboration', '.env.example')
  const collaborationEnvPath = join(root, 'services', 'collaboration', '.env')

  if (!(await exists(rootTemplatePath))) throw new Error(`Missing template: ${rootTemplatePath}`)
  if (!(await exists(collaborationTemplatePath))) throw new Error(`Missing template: ${collaborationTemplatePath}`)

  const rootExists = await exists(rootEnvPath)
  const collaborationExists = await exists(collaborationEnvPath)
  if (!pathIsInside(root, await realpath(dirname(collaborationEnvPath)))) {
    throw new ProjectConfigurationError('Collaboration environment path resolves outside the project root')
  }
  await rejectSymlink(collaborationEnvPath, 'Collaboration environment file')
  const rootTemplateContent = await readFile(rootTemplatePath, 'utf8')
  const collaborationTemplateContent = await readFile(collaborationTemplatePath, 'utf8')
  const existingRootContent = rootExists ? await readFile(rootEnvPath, 'utf8') : ''
  const existingCollaborationContent = collaborationExists ? await readFile(collaborationEnvPath, 'utf8') : ''
  const existingRootValues = parseEnv(existingRootContent)
  const existingCollaborationValues = parseEnv(existingCollaborationContent)
  const authSecret =
    !options.force && isConfiguredSecret(existingRootValues.AUTH_SECRET)
      ? existingRootValues.AUTH_SECRET
      : generatedSecret()
  const collaborationKey =
    !options.force && isConfiguredSecret(existingRootValues.COLLABORATE_API_AUTH_KEY)
      ? existingRootValues.COLLABORATE_API_AUTH_KEY
      : !options.force && isConfiguredSecret(existingCollaborationValues.API_AUTH_KEY)
        ? existingCollaborationValues.API_AUTH_KEY
        : generatedSecret()
  const internalKey =
    !options.force && isConfiguredSecret(existingRootValues.COLLABORATE_INTERNAL_API_KEY)
      ? existingRootValues.COLLABORATE_INTERNAL_API_KEY
      : !options.force && isConfiguredSecret(existingCollaborationValues.INTERNAL_API_KEY)
        ? existingCollaborationValues.INTERNAL_API_KEY
        : generatedSecret()

  const installLocalSmtp = rootExists && (!hasUsableAuthPath(existingRootValues) || usesLocalSmtp(existingRootValues))
  let rootContent = rootExists
    ? mergeMissingEnvValues(existingRootContent, rootTemplateContent, { includeLocalSmtp: installLocalSmtp })
    : rootTemplateContent
  if (installLocalSmtp) {
    rootContent = applyLegacyLocalSmtpDefaults(rootContent, rootTemplateContent, existingRootValues)
  }
  rootContent = ensureEnvValue(rootContent, 'AUTH_SECRET', authSecret)
  rootContent = ensureEnvValue(rootContent, 'COLLABORATE_API_AUTH_KEY', collaborationKey)
  rootContent = ensureEnvValue(rootContent, 'COLLABORATE_INTERNAL_API_KEY', internalKey)
  const rootValues = parseEnv(rootContent)

  let collaborationContent = collaborationExists
    ? mergeMissingEnvValues(existingCollaborationContent, collaborationTemplateContent)
    : collaborationTemplateContent
  if (!collaborationExists || options.force || !existingCollaborationValues.DATABASE_URL) {
    collaborationContent = ensureEnvValue(
      collaborationContent,
      'DATABASE_URL',
      existingRootValues.DATABASE_URL || rootValues.DATABASE_URL
    )
  }
  collaborationContent = ensureEnvValue(collaborationContent, 'API_AUTH_KEY', collaborationKey)
  collaborationContent = ensureEnvValue(collaborationContent, 'INTERNAL_API_KEY', internalKey)

  const effectiveRootValues = parseEnv(rootContent)
  const effectiveCollaborationValues = parseEnv(collaborationContent)
  if (!validEnvironmentPair(effectiveRootValues, effectiveCollaborationValues)) {
    throw new ProjectConfigurationError(
      'Environment files are incomplete or inconsistent; repair them with "doc init --force --yes"'
    )
  }

  const files = [
    { path: rootEnvPath, content: rootContent, previousContent: existingRootContent, existed: rootExists },
    {
      path: collaborationEnvPath,
      content: collaborationContent,
      previousContent: existingCollaborationContent,
      existed: collaborationExists,
    },
  ]
  const result = { created: [], updated: [], overwritten: [], skipped: [], dryRun: Boolean(options.dryRun) }
  const instance = await ensureInstanceId(root, result.dryRun)
  if (instance.created) result.created.push(instance.path)

  for (const file of files) {
    const changed = !file.existed || file.content !== file.previousContent
    if (file.existed && !changed) {
      result.skipped.push(file.path)
      continue
    }
    if (!options.dryRun) await writePrivateFile(file.path, file.content, file.existed)
    if (file.existed && options.force) result.overwritten.push(file.path)
    else if (file.existed) result.updated.push(file.path)
    else result.created.push(file.path)
  }

  return result
}

export function resolveEnvPath(root, envFile) {
  if (!envFile) return join(root, '.env')
  return isAbsolute(envFile) ? envFile : resolve(root, envFile)
}

export { exists }
