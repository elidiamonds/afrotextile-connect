---
name: Legacy schema cleanup concurrency
description: Safety rule for concurrent reviewed vendor-schema cleanup commands
---

Destructive cleanup runs must serialize through one transaction-scoped advisory lock, recheck each reviewed schema while holding it, and report schemas removed by an earlier run as skipped.

**Why:** Two commands can validate the same listing before either commits; without coordination, the second run gets an ambiguous missing-schema failure or can produce misleading partial results.

**How to apply:** Keep the lock key shared by every legacy-schema cleanup entry point, preserve exact-name validation before any DDL, and keep the drop transaction atomic for real failures.