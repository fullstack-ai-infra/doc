# Production Storage and Migrations

## Object Storage

### Provider-Neutral Interface

The `StorageProvider` interface (`src/lib/storage/interface.ts`) defines a
provider-neutral contract for binary/object storage. Two implementations ship:

| Provider              | Use Case                 | Config                        |
| --------------------- | ------------------------ | ----------------------------- |
| `FilesystemStorage`   | Development, single-node | `STORAGE_PROVIDER=filesystem` |
| `S3CompatibleStorage` | Production, multi-node   | `STORAGE_PROVIDER=s3`         |

The S3 implementation works with AWS S3, MinIO, Cloudflare R2, and DigitalOcean Spaces.

### Configuration

```env
STORAGE_PROVIDER=s3
STORAGE_NAMESPACE=files/
STORAGE_S3_ENDPOINT=https://s3.us-east-1.amazonaws.com
STORAGE_S3_BUCKET=doc-assets
STORAGE_S3_REGION=us-east-1
STORAGE_S3_ACCESS_KEY_ID=...
STORAGE_S3_SECRET_ACCESS_KEY=...
```

### Security

- **Path escape prevention**: All keys are validated against path traversal (`../`), control
  characters, and namespace escape before any I/O operation.
- **Upload limits**: Default 10 MB per upload, configurable via `StorageLimits`.
- **Content validation**: Only allowed MIME types are accepted (images, PDF, JSON, text by default).
- **Integrity**: ETags (MD5 or S3-provided) are stored with each object for verification.
- **No credentials in URLs**: Signed URLs use time-limited tokens, never persistent credentials.

### Orphan Cleanup

Assets that are no longer referenced by any document should be cleaned periodically.
Operators can schedule a job that:

1. Lists all storage keys under the namespace.
2. Cross-references with the document asset references in the database.
3. Deletes orphaned objects older than a configurable grace period (default: 7 days).

## Database Migrations

### Production Startup Safety

**Production startup NEVER performs an implicit destructive schema push.**

- `prisma db push` is for development only.
- Production uses explicit, forward-only migrations via `prisma migrate deploy`.
- The Docker entrypoint runs `prisma migrate deploy` which only applies pending migrations.

### Migration Workflow

1. **Create migration**: `npx prisma migrate dev --name <description>`
2. **Review SQL**: Inspect `prisma/migrations/<timestamp>_<name>/migration.sql`
3. **Test**: Run migration against a staging database copy.
4. **Deploy**: `npx prisma migrate deploy` in production.

### Backup Prerequisites

Before any production migration:

1. Take a full database backup (`pg_dump` or managed snapshot).
2. Verify the backup can be restored to a clean instance.
3. Document the rollback path.

### Failure Behavior

- Failed migrations leave the database in a `failed` state.
- `prisma migrate resolve --rolled-back <migration>` marks it for retry.
- Data-destructive migrations (column drops, type changes) require explicit operator confirmation.

### Rollback/Recovery Guidance

1. **Additive migrations** (new tables, columns): Safe to leave in place; rollback is optional.
2. **Destructive migrations**: Restore from the pre-migration backup.
3. **Data migrations**: Provide a reverse migration script in the migration directory.

### CI Checks

- Clean install test: runs `prisma migrate deploy` on an empty database.
- Upgrade test: applies migrations from the oldest supported schema version to current.
- Both are exercised in CI before release.
