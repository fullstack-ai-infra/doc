import 'server-only'

export class JsonBodyError extends Error {
  readonly status: number
  readonly code: 'invalid_json' | 'payload_too_large'

  constructor(status: number, code: 'invalid_json' | 'payload_too_large', message: string) {
    super(message)
    this.name = 'JsonBodyError'
    this.status = status
    this.code = code
  }
}

export async function readJsonBody(request: Request, maximumBytes = 1024 * 1024) {
  const contentLength = request.headers.get('content-length')
  if (contentLength && /^\d+$/.test(contentLength) && Number(contentLength) > maximumBytes) {
    throw new JsonBodyError(413, 'payload_too_large', `Request body must not exceed ${maximumBytes} bytes`)
  }

  const reader = request.body?.getReader()
  const decoder = new TextDecoder()
  let totalBytes = 0
  let text = ''

  if (reader) {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      totalBytes += value.byteLength
      if (totalBytes > maximumBytes) {
        try {
          await reader.cancel()
        } catch {}
        throw new JsonBodyError(413, 'payload_too_large', `Request body must not exceed ${maximumBytes} bytes`)
      }
      text += decoder.decode(value, { stream: true })
    }
    text += decoder.decode()
  }

  try {
    return JSON.parse(text) as unknown
  } catch {
    throw new JsonBodyError(400, 'invalid_json', 'Request body must contain valid JSON')
  }
}
