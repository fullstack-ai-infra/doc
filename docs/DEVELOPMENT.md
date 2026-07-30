# Development

## Repository shape

The Next.js application remains at the repository root to keep its existing App Router and Prisma
paths stable. Realtime collaboration lives in `services/collaboration` and is installed through npm
workspaces.

The document version diff and directory drag-and-drop experiments have already been integrated into
the main product. Do not retain parallel demo implementations.

## Checks

Use the narrowest relevant command while iterating:

```bash
npm run test-ci
npm run lint
npm run build:collaboration
npm run build
```

Before requesting review:

```bash
npm run check
```

## Data and migrations

Change `prisma/schema.prisma` intentionally and document any compatibility impact. Use
`npm run db:push` for local development only. The command runs an idempotent compatibility
preflight before Prisma applies the schema, including deterministic cleanup of legacy duplicate
document grants before their unique index is enforced. Do not invoke naked `prisma db push` because
that bypasses these data guards. Production releases should move to reviewed Prisma migrations
before the first stable release.

## Security-sensitive areas

- authentication and share permissions
- collaboration token generation and validation
- internal restore endpoints
- document version restore ordering
- published document moderation
- HTML, Markdown and Mermaid rendering
- uploads and object-storage URLs

Changes in these areas require a negative-path test or a written validation note.
