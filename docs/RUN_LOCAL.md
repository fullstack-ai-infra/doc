# Run doc locally

## Prerequisites

- Node.js 24
- npm 11+
- Docker with Compose

## 1. Configure

```bash
cp .env.example .env
```

Replace `AUTH_SECRET`, `COLLABORATE_API_AUTH_KEY`, and `COLLABORATE_INTERNAL_API_KEY`. The two
collaboration keys are different:

- `COLLABORATE_API_AUTH_KEY` encrypts short-lived user WebSocket tokens.
- `COLLABORATE_INTERNAL_API_KEY` authenticates server-to-server restore calls.

GitHub, email, object storage, and AI values are optional until the related feature is used.

## 2. Install and start dependencies

```bash
npm install
docker compose up -d postgres collaboration
npm run db:push
```

## 3. Start the web app

```bash
npm run dev
```

Open <http://localhost:3000>. The collaboration health endpoint is
<http://localhost:1234>.

## Run the collaboration service outside Docker

```bash
cp services/collaboration/.env.example services/collaboration/.env
npm run dev:collaboration
```

When the service runs on the host, use `localhost` in its `DATABASE_URL`. When it runs inside
Compose, use the `postgres` service name.

## Stop local infrastructure

```bash
docker compose down
```

Add `--volumes` only when you intentionally want to delete the local PostgreSQL data volume.
