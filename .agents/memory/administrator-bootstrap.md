---
name: Administrator bootstrap
description: The durable rule for bootstrapping the first Afrotextile administrator.
---

The account configured by the shared `ADMIN_EMAIL` value has administrator and vendor-reviewer access in addition to users whose Clerk public metadata role is `admin`. The web client mirrors this with `VITE_ADMIN_EMAIL`.

**Why:** The first administrator cannot grant their own Clerk metadata role through the protected reviewer controls. An explicit, environment-configured email allowlist bootstraps that account without weakening access for other users.

**How to apply:** Keep server authorization authoritative and continue accepting metadata-based admins. If the owner changes, update both shared environment values together; never replace the server check with a client-only role check.