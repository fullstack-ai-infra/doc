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

### Changed

- Replaced legacy product names, icons, domains, deployment workflows, and hosted marketing assets.
- Parameterized collaboration database reads and protected internal restore calls.
- Replaced private editor packages with reproducible public Tiptap extensions and refreshed the
  authentication, mail, Next.js 14, collaboration, storage, and Markdown dependency lines.
- Bound local Compose ports to loopback, removed fallback collaboration keys, isolated Compose
  projects per checkout, and made the collaboration image install from the root lockfile.
