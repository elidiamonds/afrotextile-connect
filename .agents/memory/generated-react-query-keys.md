---
name: Generated React Query keys
description: The generated API client requires explicit query keys when frontend code supplies query options.
---

Generated API hooks may require `queryKey` in their options object even though the generator derives a default key internally.

**Why:** The generated declaration types make `queryKey` required once a query options object is supplied, so adding only a retry or other option can fail the frontend typecheck.

**How to apply:** When customizing a generated query in a React page, include that endpoint's generated query-key helper alongside the custom options.