---
name: Expo native prebuild isolation
description: How to generate Expo iOS native assets safely in the Linux workspace for verification.
---

Run Expo iOS prebuild from a temporary staged copy of the mobile project, with the existing node_modules linked into that copy and CI enabled.

**Why:** Expo prebuild mutates package metadata and, outside a git checkout or with dirty changes, can prompt before generating native files. The workspace cannot run Xcode, but prebuild is sufficient to inspect the generated iOS asset catalog and splash storyboard.

**How to apply:** Copy app.json, package metadata, config files, and assets into a temporary directory; run `expo prebuild --platform ios --no-install --clean` with `CI=1`; inspect the generated native launch assets; always remove the temporary directory.