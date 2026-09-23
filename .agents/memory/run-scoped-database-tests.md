---
name: Run-scoped database tests
description: Preserve isolated PostgreSQL schemas in integration tests that configure DB_SCHEMA at runtime.
---

Integration tests that set `DB_SCHEMA` for a run-scoped schema must not statically import `@workspace/db` before that assignment. Import the database package dynamically after setting the schema, including any table references used by fixtures.

**Why:** The database package creates its connection pool when first imported. A static import captures the default search path, so fixture setup and route queries can use different schemas and fail with misleading 500 responses.

**How to apply:** Keep database package imports inside the test setup after `process.env.DB_SCHEMA` is assigned; use `typeof import("@workspace/db").…` for top-level type-only references when needed.