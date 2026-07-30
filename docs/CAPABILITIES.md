# doc capability inventory

This inventory describes the current implementation. `available` means the repository contains the
end-to-end product path. `experimental` means the surface exists but still has an unstable contract
or incomplete regression coverage.

`doc capabilities --json` exposes a versioned, compact grouping of this expanded inventory for
automation.

## Document lifecycle

| Capability         | Status       | Current implementation                                                                                                  |
| ------------------ | ------------ | ----------------------------------------------------------------------------------------------------------------------- |
| Document tree      | available    | Create, rename, duplicate, move, sort, favorite, search, trash, restore, and permanent cleanup                          |
| Rich-text editing  | available    | Tiptap headings, lists, tasks, tables, columns, images, links, code, Mermaid, slash commands, outline, and find/replace |
| Templates          | available    | Todo, résumé, and project-highlight starters                                                                            |
| Version history    | available    | JSON and Yjs snapshots, block-aware diff, current-state protection, and restore                                         |
| Sharing            | experimental | READ/WRITE relations and notifications enforce owner/recipient boundaries; active WebSocket revocation still needs work |
| Publishing         | experimental | Public links, republish/unpublish, moderation, owner checks, public reading, and allowlist HTML sanitization exist      |
| Export and uploads | available    | Browser-side PDF export plus compressed image upload through the current OSS adapter                                    |

Primary implementation paths:

- `src/app/api/doc/`
- `src/components/editor/`
- `src/components/doc-version/`
- `src/app/api/doc-version/`
- `src/app/api/doc/share-relation/route.ts`
- `src/app/[locale]/pub/`

## Collaboration

| Capability       | Status       | Current implementation                                                                                                 |
| ---------------- | ------------ | ---------------------------------------------------------------------------------------------------------------------- |
| Realtime editing | available    | Yjs/Hocuspocus rooms, presence, collaboration cursors, reconnection state, and browser IndexedDB cache                 |
| Authorization    | experimental | HTTP and WebSocket entry points check persisted owner/READ/WRITE access; active-connection revocation still needs work |
| Persistence      | available    | Yjs binary state and JSON projection stored against the same document                                                  |
| Recovery path    | experimental | Active-room restore exists, but there are no automated multi-client disconnect, recovery, or restore regression tests  |

Primary implementation paths:

- `src/components/editor/hooks/useCreateEditor.ts`
- `services/collaboration/src/hocuspocus/`
- `services/collaboration/src/http/collab-routes.js`

## AI assistance

| Capability           | Status       | Current implementation                                                                                  |
| -------------------- | ------------ | ------------------------------------------------------------------------------------------------------- |
| Writing operations   | available    | Continue, summarize, outline, brainstorm, expand, shorten, change tone, translate, and explain          |
| Document-side chat   | available    | Streaming responses, Markdown/Mermaid rendering, insert/replace actions, and usage limits               |
| Provider integration | experimental | DeepSeek and DeepBricks use an OpenAI-compatible adapter; provider configuration is not yet generalized |

Primary implementation paths:

- `src/components/ai-panel/`
- `src/components/editor/ai-island/`
- `src/app/api/gpt/`
- `src/lib/ai-instances.ts`

## Identity, governance, and product surface

| Capability             | Status       | Current implementation                                                                                                   |
| ---------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------ |
| Authentication         | available    | GitHub OAuth, email sign-in, and scoped personal access tokens with expiry, revocation, and one-time secret display      |
| Document API v1        | available    | Bearer-only token inspection, owner listing, authorized reads, canonical creation, and ETag-guarded metadata updates     |
| Document authorization | experimental | Browser routes, API v1, publication, and collaboration entry points enforce persisted ownership and READ/WRITE relations |
| User settings          | available    | User name and avatar                                                                                                     |
| Admin governance       | available    | Overview, user/admin management, document filtering, restore/delete, and publication moderation                          |
| Localization and theme | available    | Chinese/English plus dark, light, and system themes                                                                      |
| Object storage         | experimental | Uploads use the current Ali OSS client; a provider-neutral S3 interface is not implemented                               |

Primary implementation paths:

- `src/auth.ts`
- `src/app/api/v1/`
- `src/app/api/personal-access-tokens/`
- `src/app/admin/`
- `src/lib/admin-data.ts`
- `src/i18n/`
- `src/lib/oss.ts`

## Operations

| Capability      | Status    | Current implementation                                                                                                |
| --------------- | --------- | --------------------------------------------------------------------------------------------------------------------- |
| Container stack | available | PostgreSQL, Prisma schema application, collaboration, and Web services in Compose                                     |
| Health checks   | available | Database-aware Web and collaboration readiness endpoints                                                              |
| CLI             | available | Scoped PAT auth, document list/get/create/update, diagnostics, lifecycle, logs, development, and local database tasks |
| CI              | available | Clean install, Prisma generation, formatting, lint, tests, service syntax, CLI package checks, and production build   |

See [CLI.md](CLI.md) for the command contract.

## Deliberate gaps

The following capabilities are not claimed:

- Collaboration-aware replacement of existing document content through API v1
- API/CLI delete, restore, version restore, publish, import, or export
- Immediate active-connection revocation and a database uniqueness constraint for share recipients
- Complete like/unlike persistence, user-level deduplication, and abuse controls
- Provider-neutral object storage
- Reviewed production Prisma migrations
- Closure of the current framework, authentication, mail, and CSS toolchain security audit findings
- Complete collaboration, permission, and recovery end-to-end coverage
- Complete audit events, rate limits, metrics, tracing, and structured logs

The first remote CLI surface intentionally uses API v1 rather than direct Prisma writes. Content
replacement remains deferred until it can pass through an active-room-aware Yjs mutation gateway
without bypassing version and restore semantics.
