# doc collaboration service

Realtime document rooms for `doc`, built with Koa, Hocuspocus and Yjs.

The production source is strict TypeScript compiled to native Node.js ESM. Source imports keep
`.js` specifiers so the emitted `dist/` tree runs directly in Node without a TypeScript loader.
The CommonJS-only `koa-easy-ws` package is isolated behind one typed `createRequire` boundary.

The service:

- authenticates WebSocket users with a short-lived encrypted token;
- rechecks read/write access in PostgreSQL before every established-connection message;
- stores Yjs binary state and a Tiptap JSON projection;
- exposes protected internal endpoints for active-room version restore and exact document-user
  socket invalidation.

Persisted PostgreSQL authorization is the fail-closed boundary. The invalidation endpoint first
marks exact matching connections read-only and advances their authorization epoch, then closes
them. A lookup that was already awaiting PostgreSQL must recheck that epoch before Hocuspocus can
apply its message, so a raced stale WRITE result is rejected. If the internal request is delayed or
unavailable, the revoked client's next message is still rejected by persisted access. A READ
downgrade is applied in place, while a new WRITE grant requires a fresh authenticated connection.
Access invalidation events contain document/user identifiers and connection counts, never document
content.

Restore persists the decoded target binary and JSON projection before changing the active Yjs
document. If persistence fails, no connected client observes the target. After persistence,
active-room replacement is broadcast normally and all clients converge.

Build and run the compiled service from the repository root:

```bash
npm run typecheck --workspace @fullstack-ai-infra/doc-collaboration
npm run build --workspace @fullstack-ai-infra/doc-collaboration
npm run probe:compiled --workspace @fullstack-ai-infra/doc-collaboration
npm run start:collaboration
```

`npm run dev:collaboration` watches `.ts` sources, rebuilds them, and restarts the compiled entry
point. `start`, `probe:compiled`, and the production container execute `dist/index.js`; they never
require a development loader. The workspace `check` command builds and then runs this retained
compiled-runtime readiness probe.

Run it from the repository root:

```bash
cp services/collaboration/.env.example services/collaboration/.env
npm run dev:collaboration
```

See [`../../docs/RUN_LOCAL.md`](../../docs/RUN_LOCAL.md) for the complete local stack.
