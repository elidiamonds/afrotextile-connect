---
name: Static route smoke fixtures
description: Browser smoke tests for static SPA builds that contain API-driven pages.
---

When a browser smoke test targets a static SPA preview, stub only the page’s required API response if the page must render beyond its initial shell. Static fallback rewrites apply to API paths too, returning HTML where JSON is expected and causing a false application failure unrelated to the nested-route rewrite.

**Why:** The static preview validates document rewrites and branded assets, but it does not provide the separate API service that the development workflow normally serves.

**How to apply:** Keep the direct page navigation, response status, HTML content type, root mount, and metadata assertions real; use a minimal deterministic API fixture only for the data request needed to render the route.