# doc specification

This document describes the current implementation, not an aspirational API.

## Runtime surfaces

### Web and API

- Next.js 14 App Router
- NextAuth with GitHub and email providers
- Prisma against PostgreSQL
- Tiptap editor with Yjs collaboration
- REST-style route handlers under `src/app/api`

### Collaboration service

- Koa HTTP/WebSocket server
- Hocuspocus and Yjs document rooms
- Shared PostgreSQL document state
- Encrypted short-lived user tokens for WebSocket authentication
- Separate internal key for restore operations

### Operations CLI

- Independent `@fullstack-ai-infra/doc-cli` workspace with the `doc` binary
- Project discovery with explicit `--root` override
- Private environment initialization with independent generated secrets
- Docker/Compose/configuration diagnostics with JSON output
- Isolated Compose lifecycle, status and logs per checkout
- Explicit loopback-only development schema push
- No direct document database writes

## Core records

| Record          | Role                                                                |
| --------------- | ------------------------------------------------------------------- |
| `Doc`           | Document tree node, current JSON/binary content and lifecycle flags |
| `DocVersion`    | Immutable document snapshot used for history and restore            |
| `ShareRelation` | User-level read/write access to a document                          |
| `PubDoc`        | Public projection with moderation state                             |
| `TokenUsage`    | Per-user AI usage limit                                             |

The Prisma schema is the source of truth for field-level definitions.

## Trust boundaries

1. Browser sessions authenticate through NextAuth.
2. WebSocket connections use a short-lived encrypted token carrying `userId`.
3. The collaboration service rechecks document access in PostgreSQL.
4. Internal restore calls require `COLLABORATE_INTERNAL_API_KEY`.
5. AI provider and object-storage credentials remain server-side.

## Version restore

1. Validate the authenticated user owns the document.
2. Validate the requested historical version belongs to that document.
3. Persist the current JSON and Yjs binary state as a new version.
4. Restore the selected state through the active collaboration room.
5. Persist the restored title and content.

If an active collaboration room is unavailable, the operation fails instead of reporting a false
success.

## Known gaps

- The collaboration service needs deeper automated integration tests.
- API routes do not yet form a versioned public Agent contract.
- Object storage is coupled to an OSS client and needs a provider interface.
- CLI document CRUD and import/export require scoped PATs and a stable `/api/v1`.
- Production deployments need reviewed Prisma migrations instead of `db push`.
- Rate limits and audit events are incomplete.
