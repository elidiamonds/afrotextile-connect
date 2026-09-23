---
name: Afrotextile browser workflow dependencies
description: Runtime prerequisites for fixture-driven Afrotextile browser tests.
---

The Afrotextile web preview can start successfully while reviewer and vendor browser tests remain stuck in loading states if the shared API workflow is not running.

**Why:** The web artifact and API server are separate managed workflows, and the browser tests exercise authenticated API persistence rather than static UI alone.

**How to apply:** Before running fixture-driven Playwright coverage, confirm both `artifacts/afrotextile: web` and `artifacts/api-server: API Server` are running; restart the API workflow if reviewer lists or history never resolve.