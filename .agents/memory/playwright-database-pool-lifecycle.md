---
name: Playwright database pool lifecycle
description: How the shared database pool behaves when browser specs run in one Playwright worker
---

Browser specs that import the shared database package run in the same worker process when the Afrotextile Playwright config uses one worker. A spec that calls `pool.end()` in `afterAll` can make the next spec fail before its fixtures are created.

**Why:** Full-suite failures can look like fixture or application regressions even though the previous spec permanently closed the shared pool.

**How to apply:** Prefer process-owned pool lifecycle or worker-scoped cleanup for the full browser suite. Run a single spec in an isolated Playwright process when validating a new flow until the shared teardown is fixed. Invoke Playwright directly with the spec path when the package script's argument forwarding runs the whole suite.