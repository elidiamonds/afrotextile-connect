---
name: Workspace test build order
description: Shared TypeScript package declarations can lag source files during focused package checks.
---

Run the workspace library build/typecheck before diagnosing focused API typecheck failures. Referenced packages may otherwise expose stale declarations and report missing exports even when their source exports are present.

**Why:** Focused API validation initially reported missing database and API-schema exports until the referenced workspace libraries were rebuilt.

**How to apply:** Run `pnpm run typecheck:libs` before judging API package typecheck output after shared schema or generated-contract changes.