---
name: Drizzle test schema namespaces
description: Drizzle Kit schema filters do not namespace unqualified pgTable definitions.
---

Drizzle test bootstraps must namespace the canonical table definitions from `DB_SCHEMA`; `schemaFilter` alone only scopes introspection and can report no changes without creating tables in the run schema.

**Why:** The project has no checked-in migration set, and an earlier push with unqualified tables plus a custom schema filter silently left the isolated schema empty.

**How to apply:** Keep production/default definitions unqualified for `public`, and use a validated schema-aware table factory when `DB_SCHEMA` is set before loading the database or Drizzle config.