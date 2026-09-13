---
name: PostgreSQL test schema names
description: The identifier-length constraint for timestamped run-scoped PostgreSQL test schemas.
---

Run-scoped PostgreSQL test schema names must remain at or below 63 bytes, including every separator, timestamp, and run identifier.

**Why:** PostgreSQL truncates identifiers longer than 63 bytes, which can make the name used for setup differ from the name used for cleanup and leave schemas behind.

**How to apply:** When adding metadata to a test schema name, count the complete generated name before choosing the timestamp precision or run-id length. Keep cleanup filters aligned with the exact generated format.