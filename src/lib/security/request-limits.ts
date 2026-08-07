/**
 * Request and body size limits for HTTP and WebSocket endpoints.
 */

export interface RequestLimits {
  /** Maximum JSON body size in bytes */
  maxJsonBodyBytes: number
  /** Maximum form data size in bytes */
  maxFormDataBytes: number
  /** Maximum WebSocket message size in bytes */
  maxWsMessageBytes: number
  /** Maximum URL length in bytes */
  maxUrlBytes: number
  /** Maximum header size in bytes */
  maxHeaderBytes: number
  /** Maximum request timeout in ms */
  requestTimeoutMs: number
}

export const DEFAULT_REQUEST_LIMITS: RequestLimits = {
  maxJsonBodyBytes: 1 * 1024 * 1024, // 1 MB
  maxFormDataBytes: 10 * 1024 * 1024, // 10 MB (file uploads)
  maxWsMessageBytes: 512 * 1024, // 512 KB
  maxUrlBytes: 8 * 1024, // 8 KB
  maxHeaderBytes: 16 * 1024, // 16 KB
  requestTimeoutMs: 30_000, // 30 seconds
}

export interface CollaborationLimits {
  /** Maximum concurrent connections per document */
  maxConnectionsPerDocument: number
  /** Maximum concurrent documents per user */
  maxDocumentsPerUser: number
  /** Maximum Yjs update size in bytes */
  maxYjsUpdateBytes: number
  /** Connection idle timeout in ms */
  connectionIdleTimeoutMs: number
}

export const DEFAULT_COLLABORATION_LIMITS: CollaborationLimits = {
  maxConnectionsPerDocument: 50,
  maxDocumentsPerUser: 10,
  maxYjsUpdateBytes: 2 * 1024 * 1024, // 2 MB
  connectionIdleTimeoutMs: 5 * 60 * 1000, // 5 minutes
}

/**
 * Validate that a request body does not exceed the configured limit.
 */
export function assertBodySize(
  contentLength: number | null,
  limit: number,
  label = 'Request body'
): void {
  if (contentLength !== null && contentLength > limit) {
    throw new RequestLimitError(`${label} exceeds maximum size of ${limit} bytes`)
  }
}

/**
 * Validate WebSocket message size.
 */
export function assertWsMessageSize(
  messageBytes: number,
  limits: CollaborationLimits = DEFAULT_COLLABORATION_LIMITS
): void {
  if (messageBytes > limits.maxYjsUpdateBytes) {
    throw new RequestLimitError(
      `WebSocket message exceeds maximum size of ${limits.maxYjsUpdateBytes} bytes`
    )
  }
}

export class RequestLimitError extends Error {
  readonly code = 'request_limit_exceeded'
  readonly status = 413

  constructor(message: string) {
    super(message)
    this.name = 'RequestLimitError'
  }
}
