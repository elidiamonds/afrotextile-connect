---
name: Query retry limits
description: Custom React Query retry callbacks must preserve a finite retry budget.
---

When a React Query retry option is supplied as a callback, enforce the maximum failure count in that callback; returning true for every non-forbidden error can retry indefinitely and prevent the UI from reaching its error state.

**Why:** A vendor dashboard outage kept retrying until the service recovered because the custom callback replaced the default finite retry behavior.

**How to apply:** Combine the authorization exception with an explicit failure-count limit, then expose a user-triggered refetch after the limit is reached. Browser tests for default retries should allow enough time for the query to enter its error state before asserting the recovery control.