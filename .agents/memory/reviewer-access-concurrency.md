---
name: Reviewer access concurrency
description: Concurrency rule for administrator changes to reviewer permissions and their audit history
---

Reviewer permission mutations for one target must serialize the external Clerk metadata write with the database audit insert using a target-scoped PostgreSQL advisory lock.

**Why:** Separate administrators can overlap grant and revoke requests; without one critical section, the final Clerk state and the last completed response can disagree even when both audit rows exist.

**How to apply:** Keep the lock around the target lookup, metadata update, and audit insert. Tests should run distinct admin actors concurrently and assert one row per completed mutation plus final state from the last completed response.