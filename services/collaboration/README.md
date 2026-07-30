# doc collaboration service

Realtime document rooms for `doc`, built with Koa, Hocuspocus and Yjs.

The service:

- authenticates WebSocket users with a short-lived encrypted token;
- rechecks read/write access in PostgreSQL;
- stores Yjs binary state and a Tiptap JSON projection;
- exposes a protected internal endpoint for active-room version restore.

Run it from the repository root:

```bash
cp services/collaboration/.env.example services/collaboration/.env
npm run dev:collaboration
```

See [`../../docs/RUN_LOCAL.md`](../../docs/RUN_LOCAL.md) for the complete local stack.
