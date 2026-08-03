# Development

## Repository shape

The Next.js application remains at the repository root to keep its existing App Router and Prisma
paths stable. Realtime collaboration lives in `services/collaboration` and is installed through npm
workspaces.

The collaboration workspace uses strict TypeScript and emits native ESM to
`services/collaboration/dist`. Use `npm run dev:collaboration` for watch/rebuild/restart, or run
`npm run build:collaboration` followed by `npm run start:collaboration` to exercise the same
compiled entry point used by the container.

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

The commands above run on the host and never build the container images, so a Dockerfile that is
missing a build-time dependency still passes them. CI runs a separate `docker-build` job for that.
Reproduce it locally with:

```bash
AUTH_SECRET=ci-only-secret \
COLLABORATE_API_AUTH_KEY=ci-collaboration-token \
COLLABORATE_INTERNAL_API_KEY=ci-internal-token \
  docker compose --env-file /dev/null build
```

`--env-file /dev/null` keeps the run equivalent to a clean checkout so a local `.env` cannot be the
reason the build succeeds.

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
