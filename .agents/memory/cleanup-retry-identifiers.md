---
name: Cleanup retry identifiers
description: Privacy boundary for administrator product-photo cleanup controls
---

Administrator-facing cleanup status may identify a queued image only with an opaque server-derived identifier; managed object paths must stay server-side.

**Why:** Object paths are private storage details, while administrators still need a stable way to select one queue entry for a manual retry.

**How to apply:** Derive the identifier from the managed path on the server, return it with sanitized status data, and accept only that identifier in retry requests.