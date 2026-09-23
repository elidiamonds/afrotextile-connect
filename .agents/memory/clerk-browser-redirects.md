---
name: Clerk browser redirects
description: A browser-test stability constraint for authenticated Clerk flows
---

After a successful Clerk browser sign-in, do not assert that a signed-in user remains on `/sign-up`; Clerk or the app may redirect immediately to the authenticated vendor flow.

**Why:** A real browser run can reach the vendor application page before the test's next assertion, making an intermediate sign-up-screen check flaky even though authentication succeeded.

**How to apply:** In authenticated end-to-end tests, assert the page that the signed-in user actually needs for the scenario, and keep any sign-up-screen assertions in a signed-out test.