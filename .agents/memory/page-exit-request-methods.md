---
name: Page-exit request methods
description: Browser lifecycle cleanup requests that must preserve an HTTP method
---

When a page-exit cleanup endpoint requires `DELETE`, use `fetch` with `keepalive: true`
instead of `navigator.sendBeacon`. `sendBeacon` always submits a `POST`, so it cannot
call a DELETE-only route without a separate POST endpoint.

**Why:** A browser navigation converted a storage cleanup beacon into POST and the
server correctly returned 404; a keepalive DELETE completed during the same navigation.

**How to apply:** Keep the request body small, guard against duplicate lifecycle callbacks,
and verify the object is gone after navigation while a saved reference remains available.