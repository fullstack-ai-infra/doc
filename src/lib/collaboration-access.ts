import 'server-only'

interface NotifyCollaborationAccessRevokedDeps {
  fetchImpl?: typeof fetch
}

/**
 * Ask the collaboration service to close matching active connections after persisted access is
 * revoked. This is an acceleration path; collaboration messages independently recheck the DB and
 * fail closed if this call is unavailable.
 */
export async function notifyCollaborationAccessRevoked(
  docId: string,
  userId: string,
  deps: NotifyCollaborationAccessRevokedDeps = {}
) {
  const baseUrl = process.env.COLLABORATE_EDIT_HTTP_URL || ''
  const internalKey = process.env.COLLABORATE_INTERNAL_API_KEY || ''
  if (!baseUrl || !internalKey) return false

  const fetchImpl = deps.fetchImpl || fetch
  try {
    const response = await fetchImpl(
      `${baseUrl.replace(/\/$/, '')}/collab/documents/${encodeURIComponent(docId)}/access/revoke`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-doc-internal-key': internalKey,
        },
        body: JSON.stringify({ userId }),
        signal: AbortSignal.timeout(2_000),
      }
    )
    if (!response.ok) return false

    const payload = await response.json().catch(() => null)
    return payload?.success === true
  } catch {
    return false
  }
}
