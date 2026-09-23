---
name: Browser/API test state boundaries
description: Choosing reliable assertions when browser tests and a running API may not share the same database session or schema.
---

When browser coverage talks to a separately running API workflow, establish expected persisted state through the browser/API response rather than assuming a direct database handle in the Playwright process sees the same schema.

**Why:** A focused reviewer-history run returned a successful API mutation, but the Playwright process’s direct database query saw no corresponding row because the processes were not using the same database view.

**How to apply:** Use the UI or an authenticated API response to capture the baseline immediately before interception, then assert that repeated retries and reloads preserve the same visible entry count or IDs. Use direct database access only for fixture setup/cleanup when its schema is explicitly shared.