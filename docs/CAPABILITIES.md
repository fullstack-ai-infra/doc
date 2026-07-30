# doc capability inventory

This inventory describes the current implementation. `available` means the repository contains the
end-to-end product path. `experimental` means the surface exists but still has an unstable contract
or incomplete regression coverage.

`doc capabilities --json` exposes a versioned, compact grouping of this expanded inventory for
automation.

## Document lifecycle

| Capability         | Status       | Current implementation                                                                                                   |
| ------------------ | ------------ | ------------------------------------------------------------------------------------------------------------------------ |
| Document tree      | available    | Create, rename, duplicate, move, sort, favorite, search, trash, restore, and permanent cleanup                           |
| Rich-text editing  | available    | Tiptap headings, lists, tasks, tables, columns, images, links, code, Mermaid, slash commands, outline, and find/replace  |
| Templates          | available    | Todo, résumé, and project-highlight starters                                                                             |
| Version history    | available    | JSON and Yjs snapshots, block-aware diff, current-state protection, and restore                                          |
| Sharing            | experimental | READ/WRITE relations and notifications exist, but relation mutations still need owner checks                             |
| Publishing         | experimental | Public links, republish/unpublish, moderation state, and public reading exist; publication creation needs an owner check |
| Export and uploads | available    | Browser-side PDF export plus compressed image upload through the current OSS adapter                                     |

Primary implementation paths:

- `src/app/api/doc/`
- `src/components/editor/`
- `src/components/doc-version/`
- `src/app/api/doc-version/`
- `src/app/api/doc/share-relation/route.ts`
- `src/app/[locale]/pub/`

## Collaboration

| Capability       | Status       | Current implementation                                                                                                |
| ---------------- | ------------ | --------------------------------------------------------------------------------------------------------------------- |
| Realtime editing | available    | Yjs/Hocuspocus rooms, presence, collaboration cursors, reconnection state, and browser IndexedDB cache                |
| Authorization    | experimental | The WebSocket layer checks tokens and persisted access; upstream share mutation handlers still need owner hardening   |
| Persistence      | available    | Yjs binary state and JSON projection stored against the same document                                                 |
| Recovery path    | experimental | Active-room restore exists, but there are no automated multi-client disconnect, recovery, or restore regression tests |

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

| Capability             | Status       | Current implementation                                                                                                        |
| ---------------------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| Authentication         | available    | GitHub OAuth, development SMTP email, and production Resend email                                                             |
| Document authorization | experimental | Ownership and READ/WRITE relations exist, but single-document reads, share mutations, and publication creation need hardening |
| User settings          | available    | User name and avatar                                                                                                          |
| Admin governance       | available    | Overview, user/admin management, document filtering, restore/delete, and publication moderation                               |
| Localization and theme | available    | Chinese/English plus dark, light, and system themes                                                                           |
| Object storage         | experimental | Uploads use the current Ali OSS client; a provider-neutral S3 interface is not implemented                                    |

Primary implementation paths:

- `src/auth.ts`
- `src/app/admin/`
- `src/lib/admin-data.ts`
- `src/i18n/`
- `src/lib/oss.ts`

## Operations

| Capability      | Status    | Current implementation                                                                                              |
| --------------- | --------- | ------------------------------------------------------------------------------------------------------------------- |
| Container stack | available | PostgreSQL, Prisma schema application, collaboration, and Web services in Compose                                   |
| Health checks   | available | Database-aware Web and collaboration readiness endpoints                                                            |
| CLI             | available | Configuration initialization, diagnostics, lifecycle, status, logs, development, and local database tasks           |
| CI              | available | Clean install, Prisma generation, formatting, lint, tests, service syntax, CLI package checks, and production build |

See [CLI.md](CLI.md) for the command contract.

## Deliberate gaps

The following capabilities are not claimed:

- Stable `/api/v1` Agent/document API
- Personal access tokens with scopes, expiry, and revocation
- Permission hardening for existing document, share, and publication handlers before any public API exposure
- Complete like/unlike persistence, user-level deduplication, and abuse controls
- CLI document CRUD, version restore, publish, import, or export
- Provider-neutral object storage
- Reviewed production Prisma migrations
- Complete collaboration, permission, and recovery end-to-end coverage
- Complete audit events, rate limits, metrics, tracing, and structured logs

Remote document CLI commands must wait for a canonical authenticated API. Direct Prisma writes
would bypass ownership, share relations, Yjs state, version snapshots, and restore semantics.
