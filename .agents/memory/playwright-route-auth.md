---
name: Authenticated Playwright interception
description: Preserving browser authentication while changing request payloads in Playwright route handlers
---

When a browser test needs to alter an authenticated request before it reaches the app, use `route.continue({ postData })` so the original browser cookies and headers remain attached. A server-side `route.fetch()` may not carry the browser's Clerk session and can turn the intended application response into a misleading 401.

**Why:** A storefront validation regression test initially intercepted a request with `route.fetch()`, which dropped the browser session even though the page was signed in.

**How to apply:** Use `route.fetch()` only when the test intentionally wants an independent server-side request. For authenticated browser flows, mutate the payload and continue the original route.