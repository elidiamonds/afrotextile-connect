---
name: Temporary product image lifecycle
description: Browser cleanup rules for uploaded product images that have not been saved
---

Track a temporary object path as soon as the upload URL is issued, not only after the upload completes. On pagehide and editor unmount, attempt cleanup for every tracked path, and remove a path from tracking only after the server confirms deletion or that it is already resolved.

**Why:** A navigation can unmount the editor while an upload is still completing, and tying cleanup to only the current form image leaves replaced or late-finishing uploads behind.

**How to apply:** Keep temporary paths separate from persisted product references; let failed cleanup remain tracked so the server retry queue or a later lifecycle event can resolve it.