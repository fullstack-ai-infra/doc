# Document API v1

`doc` exposes a Bearer-only API for document automation. The browser session API and the public
document API are separate: scripts use `/api/v1`, while personal access tokens are created and
revoked from the signed-in user settings page.

The current v1 surface is intentionally small. It supports token inspection, owner document
listing, document reads, document creation, and concurrency-safe metadata updates. It does not
yet expose content replacement, delete/restore, versions, publishing, or workspace import/export.

## Authentication

Create a personal access token in `/user-info`. A token:

- starts with `doc_pat_`;
- is shown only once;
- is stored by the server as a SHA-256 digest;
- has an explicit expiry between 1 and 365 days;
- can be revoked without changing the account password; and
- carries one or both of `documents:read` and `documents:write`.

Pass the raw token in the request header:

```http
Authorization: Bearer doc_pat_...
```

`documents:read` is required for list and get. `documents:write` is required for create and
update. Token-management routes require an authenticated browser session and are not part of the
Bearer API.

Do not put tokens in command arguments, URLs, repository files, or shell history. The CLI accepts
tokens through a hidden terminal prompt, standard input, or `DOC_API_TOKEN`.

The CLI binds a saved token to its saved origin and rejects API base URLs with a path. On Windows,
use `DOC_API_TOKEN` from a protected credential source instead of plaintext CLI persistence.

## Response contract

Successful responses use:

```json
{
  "data": {},
  "requestId": "request-id"
}
```

Collection responses may also include `meta`. Errors use the real HTTP status and a stable code:

```json
{
  "error": {
    "code": "document_not_found",
    "message": "Document not found"
  },
  "requestId": "request-id"
}
```

Every response is private and non-cacheable and includes `X-Request-Id`. A valid incoming
`X-Request-Id` is echoed; otherwise the server creates one.

## Endpoints

### Inspect the token

```http
GET /api/v1/me
```

The response contains `authenticated`, `userId`, and the token's `scopes`.

### List documents

```http
GET /api/v1/documents?limit=50&cursor=...&query=...&starred=true&trash=false
```

The list contains documents owned by the token's user. `limit` defaults to `50` and must be from
`1` to `100`. Follow `meta.nextCursor` until it is `null`; cursors are opaque. `starred` and
`trash` accept only `true` or `false`. `query` is limited to 200 characters.

```json
{
  "data": [
    {
      "id": "document-id",
      "title": "Runbook",
      "icon": null,
      "parentId": null,
      "starred": false,
      "deleted": false,
      "access": "owner",
      "createdAt": "2026-07-30T00:00:00.000Z",
      "updatedAt": "2026-07-30T00:00:00.000Z"
    }
  ],
  "meta": {
    "nextCursor": null
  },
  "requestId": "request-id"
}
```

### Read a document

```http
GET /api/v1/documents/{id}
```

Owners and explicit READ/WRITE recipients can read an active document. The response adds the
TipTap JSON `content` field and returns an `ETag` header. Inaccessible and missing documents both
return `404`, so the endpoint does not reveal another user's document IDs.

### Create a document

```http
POST /api/v1/documents
Content-Type: application/json
```

```json
{
  "title": "Runbook",
  "icon": "📘",
  "parentId": null,
  "content": {
    "type": "doc",
    "content": [
      {
        "type": "paragraph",
        "content": [{ "type": "text", "text": "First response steps" }]
      }
    ]
  }
}
```

`title` is required. `icon`, `parentId`, and `content` are optional. The current server-side
codec accepts the basic TipTap nodes supported by StarterKit plus underline, text alignment,
subscript, superscript, highlight, task lists, and safe links. Unsupported custom editor nodes are
rejected with `422` instead of being silently discarded.

Requests are limited to 1 MiB. Titles are limited to 100 characters, icons to 32 characters, and
TipTap content to 10,000 nodes, 64 levels, and 50,000 text characters. A user may have at most 100
active documents. Limit violations return `413 payload_too_large`, `422 validation_error` or
`invalid_content`, and `429 document_limit_reached` as appropriate.

The server creates matching JSON and Yjs state. A successful response is `201`, includes the
created document, and returns `Location` and `ETag`.

### Update document metadata

```http
PATCH /api/v1/documents/{id}
Content-Type: application/json
If-Match: "etag-from-get"
```

```json
{
  "title": "Production runbook",
  "icon": null,
  "isStar": true
}
```

At least one of `title`, `icon`, or `isStar` is required. Only the owner can update a document.
The response contains metadata only, so a write-only token cannot use this endpoint to read
document content.
`If-Match` prevents lost updates:

- omit it: `428 precondition_required`;
- send a stale value: `412 document_conflict`;
- send the current document `ETag`: update atomically; or
- send `*`: deliberately force a metadata update.

Content replacement is not accepted by this endpoint. It needs a collaboration-aware mutation
path so an API write cannot diverge from an active Yjs room.

## CLI mapping

```bash
doc auth login --url https://docs.example.com
doc auth status
doc ls
doc get <document-id>
doc create --title "Runbook" --content-file runbook.json
doc update <document-id> --title "Production runbook" --if-match '"etag"'
doc update <document-id> --star --force
doc auth logout
```

The CLI rejects plain HTTP for non-loopback hosts. See [CLI.md](CLI.md) for configuration
precedence, output modes, exit codes, and local operations commands.
