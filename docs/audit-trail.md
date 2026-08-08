# Audit Trail

## Overview

The audit trail records consequential document-plane actions in an append-only log.
Events are never deleted or modified through application APIs.

## Recorded Events

| Action                   | Description                           |
| ------------------------ | ------------------------------------- |
| document.create          | New document created                  |
| document.delete          | Document moved to trash               |
| document.metadata_update | Title, icon, or star status changed   |
| document.content_mutate  | Content changed via API mutation      |
| permission.grant         | Share access granted                  |
| permission.change        | Share access level changed            |
| permission.revoke        | Share access revoked                  |
| version.create           | Version snapshot saved                |
| version.restore          | Document restored to previous version |
| publish.publish          | Document published                    |
| publish.unpublish        | Document unpublished                  |
| proposal.create          | Agent proposal submitted              |
| proposal.approve         | Proposal approved                     |
| proposal.deny            | Proposal denied                       |
| proposal.commit          | Proposal committed to document        |
| bundle.export            | Document bundle exported              |
| bundle.import            | Document bundle imported              |
| token.create             | Personal access token created         |
| token.revoke             | Personal access token revoked         |

## Event Schema

Each audit record includes:

- **actor**: principal ID who performed the action
- **actorType**: `user`, `agent`, or `system`
- **action**: one of the actions above
- **target**: resource identifier (document ID, token ID, etc.)
- **targetType**: resource type qualifier
- **outcome**: `success`, `failure`, or `denied`
- **requestId**: correlation ID from the originating request
- **idempotencyKey**: caller-provided deduplication key
- **metadata**: safe structured context (never document bodies or secrets)
- **createdAt**: UTC timestamp

## Redaction Policy

The following are **never** stored in audit metadata:

- Document content/body
- Credentials, tokens, or secrets
- Binary data
- Session material

## Retention and Export (Self-Hosters)

- **Default retention**: indefinite (append-only).
- **Export**: Query the `AuditLog` table directly via SQL or use the `/api/v1/audit` endpoint.
- **Archival**: Operators may archive old records to cold storage using standard PostgreSQL tooling (pg_dump with date filters).
- **Pruning**: If retention limits are required, use a scheduled job to DELETE records older than the desired window. This is an operator decision, not enforced by the application.

## API Access

`GET /api/v1/audit` — requires `documents:read` scope.

Query parameters:

- `target` — filter by target resource ID
- `actor` — filter by actor ID
- `action` — filter by action type
- `start_time` / `end_time` — ISO 8601 time range
- `cursor` — pagination cursor from previous response
- `limit` — results per page (1-100, default 50)

Non-admin users only see events where they are the actor.
