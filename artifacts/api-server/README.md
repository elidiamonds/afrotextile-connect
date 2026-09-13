# API server tests

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

Do not run `drizzle-kit push` against the shared development schema as a
replacement for this bootstrap. The integration suite intentionally creates
its own isolated schema for every process.
