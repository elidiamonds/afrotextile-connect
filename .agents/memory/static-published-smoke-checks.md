---
name: Static published smoke checks
description: Static artifact deployments do not provide a post-deploy command hook for network smoke checks.
---

Run published-URL smoke checks as an explicit release validation command, passing the deployment URL through an environment variable or CLI argument. Keep static deployment builds focused on producing and locally validating the files.

**Why:** Static services only expose build and file-serving configuration; attempting to add a post-deploy network check to the artifact manifest is unsupported and cannot verify the newly served deployment.

**How to apply:** For static artifacts, provide a dedicated published-check command and run it after publishing from the release workflow or operator.