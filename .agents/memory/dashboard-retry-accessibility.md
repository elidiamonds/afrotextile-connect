---
name: Dashboard retry accessibility
description: Accessible behavior for React Query dashboard retries that temporarily clear the error state.
---

When a dashboard query is retried after an outage, keep the outage panel mounted until the retry interaction finishes, even if the query temporarily clears its error state or receives data before the refetch promise settles.

**Why:** React Query can clear `isError` during refetch, and switching immediately to another empty state or the dashboard can remove the focused retry control before assistive technology can receive its busy state.

**How to apply:** Pair an explicit retry interaction state with `aria-busy`, a changing accessible name, and an announced error region. Browser coverage should assert the live outage message, keyboard focus, keyboard activation, and recovery.