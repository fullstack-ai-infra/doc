# Changelog

All notable changes to `doc` are documented here.

## [Unreleased]

### Added

- New `doc` product identity and mem-aligned dark-first design system.
- Next.js document product and integrated Yjs/Hocuspocus collaboration service.
- Document version history, diff, and restore capability.
- Local PostgreSQL and collaboration Docker Compose services.
- Product goal, current specification, development and local-run documentation.
- `doc` operations CLI with capability inventory, secure initialization, diagnostics, full-stack
  lifecycle, status, logs, development, and guarded local database commands.
- Database-aware Web and collaboration health endpoints.
- Full Docker Compose stack for PostgreSQL, schema application, collaboration, and Web.
- Bearer-only `/api/v1` document endpoints for token inspection, listing, reading, canonical
  creation, and ETag-guarded metadata updates.
- Remote `doc auth`, `doc ls`, `doc get`, `doc create`, and `doc update` commands with private
  credential storage, bounded requests, machine-readable output, and no checkout requirement.

### Changed

- Replaced legacy product names, icons, domains, deployment workflows, and hosted marketing assets.
- Parameterized collaboration database reads and protected internal restore calls.
- Replaced private editor packages with reproducible public Tiptap extensions and refreshed the
  authentication, mail, Next.js 14, collaboration, storage, and Markdown dependency lines.
- Bound local Compose ports to loopback, removed fallback collaboration keys, isolated Compose
  projects per checkout, and made the collaboration image install from the root lockfile.
- Hardened legacy document reads, duplication, sharing, publishing, and collaboration monitoring
  against cross-user access and soft-deleted document access.
- Added scoped, expiring, and revocable personal access tokens with a session-protected bilingual
  management interface that reveals new token values only once.
- Sanitized new and existing published document HTML through a server-side allowlist before public
  rendering.
- Restricted collaboration-rendered TipTap attributes to safe values and stopped locale redirects
  from trusting forwarded origin headers.
- Bounded token, sharing, and publishing mutation bodies, kept internal-key checks constant-time,
  and stopped publication storage errors from reaching clients.
- Made document-share creation concurrency-safe and ensured revocation removes legacy duplicate
  grants before enforcing their database uniqueness constraint.
- Bounded and validated the legacy document-create route, storing canonical TipTap JSON together
  with matching Yjs state for new content.
- Restricted published HTML classes and data attributes to the product's explicit TipTap feature
  set, and neutralized terminal control sequences in CLI errors before PAT redaction.
