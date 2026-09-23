---
name: Vite artifact build environment
description: Direct production builds need the same PORT and BASE_PATH values provided by managed workflows.
---

Managed artifact workflows provide both `PORT` and `BASE_PATH`; a direct Vite production build must provide them explicitly or the config exits before bundling.

**Why:** The artifact Vite config intentionally fails fast when either runtime routing value is missing, while the workflow injects them automatically.

**How to apply:** When validating an artifact outside its workflow, set `PORT` to a supported local port and `BASE_PATH` to the artifact preview path before running its build command.