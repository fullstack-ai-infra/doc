# doc collaboration service

Realtime document rooms for `doc`, built with Koa, Hocuspocus and Yjs.

The production source is strict TypeScript compiled to native Node.js ESM. Source imports keep
`.js` specifiers so the emitted `dist/` tree runs directly in Node without a TypeScript loader.
The CommonJS-only `koa-easy-ws` package is isolated behind one typed `createRequire` boundary.

The service:

- authenticates WebSocket users with a short-lived encrypted token;
- rechecks read/write access in PostgreSQL;
- stores Yjs binary state and a Tiptap JSON projection;
- exposes a protected internal endpoint for active-room version restore.

Build and run the compiled service from the repository root:

```bash
npm run typecheck --workspace @fullstack-ai-infra/doc-collaboration
npm run build --workspace @fullstack-ai-infra/doc-collaboration
npm run start:collaboration
```

`npm run dev:collaboration` watches `.ts` sources, rebuilds them, and restarts the compiled entry
point. `start` and the production container always execute `dist/index.js`; they never require a
development loader.

Run it from the repository root:

```bash
cp services/collaboration/.env.example services/collaboration/.env
npm run dev:collaboration
```

See [`../../docs/RUN_LOCAL.md`](../../docs/RUN_LOCAL.md) for the complete local stack.
