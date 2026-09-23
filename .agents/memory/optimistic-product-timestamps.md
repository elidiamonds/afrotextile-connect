---
name: Optimistic product timestamp precision
description: Product update concurrency tokens come from millisecond API dates while PostgreSQL timestamps may retain finer precision.
---

Compare an API-supplied product update timestamp at millisecond precision in the database predicate rather than using direct timestamp equality.

**Why:** JavaScript `Date` values and serialized API dates carry milliseconds, but PostgreSQL `timestamptz` defaults can retain sub-millisecond precision. Direct equality can reject the first legitimate browser edit as stale.

**How to apply:** When adding optimistic concurrency to similarly modeled records, either use a dedicated version token or normalize the database timestamp to the precision exposed by the API before comparing it.