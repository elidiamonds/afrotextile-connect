---
name: Nested database constraint errors
description: Database drivers and ORM layers may wrap PostgreSQL constraint errors before application code handles them.
---

When an API uses a PostgreSQL unique constraint to identify an idempotent replay, inspect the complete error cause chain for `23505`; checking only the outer error can turn a safe replay into a false 500.

**Why:** The observed Drizzle error exposed the PostgreSQL code on its nested `cause`, so a top-level-only check failed under repeated browser retries.

**How to apply:** Keep constraint classification narrowly scoped to the wrapped database error chain, then replay only when the deterministic idempotency identifier belongs to the same owner.