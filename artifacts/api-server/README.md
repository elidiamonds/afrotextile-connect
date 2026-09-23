# API server tests

## Database-backed integration preflight

Every database-backed integration suite must use the same fail-closed
bootstrap order:

1. Generate a unique run-scoped schema name.
2. Set `DB_SCHEMA` before importing `@workspace/db` or the application.
3. Create only that generated schema.
4. Immediately call `assertDatabaseSchema(runSchema)`.
5. Continue with canonical schema setup and fixture writes only after the
   assertion succeeds.

The schema creation is the only setup DDL before the guard. A mismatch must
stop the suite before any table, fixture, or cleanup writes run. The assertion
checks PostgreSQL's actual `current_schema()`, not only the environment
variable, so a missing or misconfigured connection `search_path` fails closed.
Use a dynamic database-package import when setting `DB_SCHEMA` at runtime:

```ts
process.env.DB_SCHEMA = runSchema;
const { assertDatabaseSchema, db } = await import("@workspace/db");

await db.execute(sql`CREATE SCHEMA ${sql.identifier(runSchema)}`);
await assertDatabaseSchema(runSchema);
// Canonical schema setup and fixtures are safe to start here.
```

Do not point integration setup at `public` or an application schema, and keep
cleanup restricted to explicitly generated test-schema names.

## Vendor integration tests

Run the vendor authorization regression suite with:

```sh
pnpm --filter @workspace/api-server test -- src/routes/vendors.integration.test.ts
```

The suite requires `DATABASE_URL` to point to a PostgreSQL database where the
test role can create and drop schemas. It does not use the shared `public`
schema. At startup it:

1. Generates a unique `vendor_permission_<start-time>_<run-id>` schema.
2. Sets `DB_SCHEMA` before loading the API or database package, which makes the
   connection pool use that schema first in its PostgreSQL `search_path`.
3. Creates the full canonical Drizzle schema in that run-scoped schema with
   `drizzle-kit push`, using `DB_SCHEMA`/`schemaFilter` so the push cannot target
   `public`.
4. Drops the entire schema with `CASCADE` during teardown.

The run-scoped schema means an interrupted process cannot leave vendor rows in
development data, and teardown is safe to repeat. A hard process kill can still
leave the empty test schema behind. The normal test command does not scan or
drop old schemas. To opt into a bounded cleanup pass, set
`VENDOR_PERMISSION_CLEANUP_STALE=1`:

```sh
VENDOR_PERMISSION_CLEANUP_STALE=1 \
  pnpm --filter @workspace/api-server test -- src/routes/vendors.integration.test.ts
```

The opt-in pass only considers names matching
`vendor_permission_<10-digit-start-time>_<32-hex-run-id>`, ignores schemas
younger than 24 hours, and removes at most 10 schemas in one test startup.
It uses `DROP SCHEMA ... CASCADE` only for those exact run-scoped names; it
does not inspect or modify application schemas. A CI integration-test job can
set the same variable so an interrupted run is cleaned up by a later run.
When enabled, the startup pass prints a summary such as
`Vendor test schema cleanup: selected 3, removed 3.` to the test output, where
the counts are the number of eligible schemas selected and successfully
removed. The normal test command remains quiet and does not print this
summary. If the selected count reaches the batch limit, it also warns that
additional stale schemas may remain and tells CI operators to rerun cleanup.
The warning is only emitted by the opt-in pass.
The suite also includes a cleanup safety regression check that creates stale,
fresh, legacy-shaped, active-shaped, and application-shaped schemas, then
verifies that only the bounded number of eligible timestamped schemas are
removed. This check is skipped unless the opt-in variable is enabled.

### Reviewing and removing legacy test schemas

The previous test bootstrap used names in the
`vendor_permission_<run-id>` format. Those names have no age information, so
the normal test startup sweep deliberately does not guess whether they are
still in use. Use the separate maintenance command when an operator has
reviewed the candidates:

```sh
# Read-only inventory. This never drops a schema.
pnpm --filter @workspace/api-server cleanup:legacy-vendor-schemas --list

# After reviewing the inventory, pass only the exact names approved for removal.
pnpm --filter @workspace/api-server cleanup:legacy-vendor-schemas \
  --drop vendor_permission_00000000-0000-4000-8000-000000000000 \
  --confirm
```

The command only recognizes the old UUID-shaped
`vendor_permission_<run-id>` names (hyphenated UUIDs or 32-character
hexadecimal IDs). It rejects `DB_SCHEMA`, application-shaped names, unknown
names, duplicates, and any name not present in the current inventory. The
`--confirm` flag is required in addition to the explicit `--drop` allowlist;
the command uses `DROP SCHEMA ... CASCADE` only after every requested name has
passed those checks.

For CI maintenance, run the read-only inventory as a visible maintenance step.
If a reviewer approves cleanup, store the exact comma-separated names from that
listing in a non-secret CI variable and pass it as the reviewed allowlist:

```sh
pnpm --filter @workspace/api-server cleanup:legacy-vendor-schemas --list
pnpm --filter @workspace/api-server cleanup:legacy-vendor-schemas \
  --drop "$VENDOR_PERMISSION_LEGACY_SCHEMA_ALLOWLIST" \
  --confirm
```

Do not use a wildcard, a prefix-only value, or an automatically generated
allowlist. A changed database inventory causes the command to fail closed, so
the list must be reviewed again before retrying.

Do not run `drizzle-kit push` against the shared development schema as a
replacement for this bootstrap. The integration suite intentionally creates
its own isolated schema for every process.
