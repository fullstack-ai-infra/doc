# Security Baseline

## Dependency Audit Policy

- All production dependencies are audited on every CI run via `npm audit --audit-level=high`.
- Critical/high findings must be resolved or explicitly risk-accepted with an expiry date before merge.
- Accepted risks are tracked in `docs/risk-acceptance.md` (create as needed).

## CI Enforcement

The CI pipeline (`check` script) must pass before merge:

- Linting and formatting
- Full test suite
- Build verification for all workspaces

## Request and Body Limits

| Limit             | Default |
| ----------------- | ------- |
| JSON body         | 1 MB    |
| Form/upload data  | 10 MB   |
| WebSocket message | 512 KB  |
| URL length        | 8 KB    |
| Header size       | 16 KB   |
| Request timeout   | 30 s    |

## Collaboration Room Limits

| Limit                     | Default |
| ------------------------- | ------- |
| Connections per document  | 50      |
| Active documents per user | 10      |
| Yjs update size           | 2 MB    |
| Connection idle timeout   | 5 min   |

## Rate Limiting

| Scope             | Budget        | Refill            |
| ----------------- | ------------- | ----------------- |
| API per principal | 60 req        | 1/s               |
| Auth per IP       | 10 attempts   | 0.167/s (~10/min) |
| WebSocket per IP  | 5 connections | 0.083/s (~5/min)  |

In-memory token-bucket implementation. For multi-node deployments, replace with Redis-backed store.

## Logging and Metrics

- Structured JSON logs with redaction of document content and credentials.
- No PII in log messages beyond actor identifiers.
- Health endpoints at `/api/health` (liveness) and `/api/health/ready` (readiness).
- Readiness checks validate database and storage connectivity.

## Backup and Restore

### Database

- Run `pg_dump` or equivalent before migrations.
- Verify restore on synthetic data monthly.
- Migration failures halt deployment; no implicit destructive schema changes.

### Object Storage

- S3-compatible lifecycle/versioning recommended for asset recovery.
- Filesystem provider: maintain external backups of the storage directory.

## Threat Model

### Personal Access Tokens

- Scoped per user; stored hashed in the database.
- Token revocation takes effect immediately on next request.
- Tokens do not grant access to other users' data.

### Collaboration WebSockets

- Authenticated via session/token before upgrade.
- Rate-limited at connection and message level.
- Message size enforced to prevent memory exhaustion.
- Idle connections reaped after timeout.

### Publishing

- Published HTML is sanitized (see `sanitize-published-html.ts`).
- Published documents use separate public paths; no session cookies.
- Draft content is never exposed via publish endpoints.

### Internal Restore Endpoints

- Restore requires document owner or admin permissions.
- Base-version preconditions prevent stale overwrites.
- Audit log records all restore actions.

## Maturity Statement

This baseline provides:

- Bounded resource usage for HTTP and WebSocket
- Health observability for orchestrators (Kubernetes, Docker Compose)
- Dependency audit enforcement
- Documented threat model for key attack surfaces

It does NOT yet provide:

- Distributed rate limiting (requires Redis)
- WAF-level protections
- Formal penetration testing results
