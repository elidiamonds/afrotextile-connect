---
name: Object deletion propagation
description: Eventual consistency seen when browser tests verify App Storage object cleanup
---

Browser checks of deleted App Storage objects should poll for the final 404 rather than
asserting it on the first request. The storage provider can return a short-lived 500 while
the deletion propagates, even after the cleanup endpoint has returned 204.

**Why:** A real vendor-photo cleanup run returned 500 immediately after DELETE, then 404
within the same verification window; treating the first response as final made the smoke
test flaky.

**How to apply:** Use a bounded poll around the object URL when verifying cleanup, and keep
the browser scenario timeout large enough for Clerk setup plus storage propagation.