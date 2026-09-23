---
name: Clerk browser session identity
description: Prevent stale Clerk sessions from making role-based browser assertions run as the wrong fixture.
---

Clerk Playwright sign-in helpers can return while an existing active session is still present, so role-sensitive tests must sign out before switching fixtures and wait for the expected user ID after sign-in.

**Why:** The helper’s built-in readiness check can treat an undefined user as ready, allowing a previous administrator session to remain active while a test believes it is exercising a reviewer.

**How to apply:** Make fixture sign-in helpers accept the expected Clerk user ID, sign out first, and wait until `window.Clerk.user.id` matches that ID before navigating to protected role-specific pages.