DO $$
BEGIN
  -- Existing db-push installations may contain duplicate grants. A fresh database does not have
  -- the table yet, so the preflight must remain a no-op until Prisma creates the schema.
  IF to_regclass('"ShareRelation"') IS NULL THEN
    RETURN;
  END IF;

  -- Keep writes out until duplicate cleanup and the unique index are both complete. Preserve the
  -- earliest grant deterministically so repeated preflight runs have the same result.
  EXECUTE 'LOCK TABLE "ShareRelation" IN SHARE ROW EXCLUSIVE MODE';
  EXECUTE $deduplicate$
    WITH ranked AS (
      SELECT
        id,
        ROW_NUMBER() OVER (
          PARTITION BY "docId", "userId"
          ORDER BY "createdAt" ASC, id ASC
        ) AS duplicate_rank
      FROM "ShareRelation"
    )
    DELETE FROM "ShareRelation" AS relation
    USING ranked
    WHERE relation.id = ranked.id
      AND ranked.duplicate_rank > 1
  $deduplicate$;

  EXECUTE
    'CREATE UNIQUE INDEX IF NOT EXISTS "ShareRelation_docId_userId_key" ' ||
    'ON "ShareRelation" ("docId", "userId")';
END
$$;
