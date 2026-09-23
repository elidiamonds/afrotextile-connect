---
name: Playwright browser runner
description: Replit workspace constraints for running Playwright against managed preview workflows
---

Configure Playwright's Chromium path under `use.launchOptions.executablePath`, using the
`REPLIT_PLAYWRIGHT_CHROMIUM_EXECUTABLE` environment variable with `/repl/tools/bin/chromium`
as a fallback. Do not enable video capture unless the runner also has Playwright's bundled
ffmpeg installed.

**Why:** The workspace provides a system Chromium binary, while a newly installed Playwright
may otherwise search for an uninstalled bundled browser and ffmpeg.

**How to apply:** Keep browser tests pointed at `PLAYWRIGHT_BASE_URL` or `REPLIT_DEV_DOMAIN`
so the web and API artifact workflows are exercised through the shared preview host.

For a genuinely focused run, invoke `pnpm exec playwright test <spec> ...` from the artifact
directory. Forwarding a spec path through the package script can leave the runner unfiltered
and execute every browser suite in the workspace.

**Why:** A forwarded `--` argument caused a targeted vendor spec command to run all configured
browser files, which introduced unrelated teardown failures and obscured the focused result.

**How to apply:** Use the direct Playwright CLI when iterating on one spec or test title; use
the package script only when the full configured browser suite is intended.

Fixture-driven flows that create multiple Clerk browser contexts can exceed the
default 30-second Playwright test timeout even when individual requests are
healthy; give those end-to-end tests an explicit longer budget.

**Why:** Adding a second authenticated reviewer context to the product-history
flow pushed the complete owner, reviewer, and denial lifecycle past the default
timeout, interrupting otherwise successful teardown.

**How to apply:** Set a per-test timeout appropriate to the full fixture lifecycle
when a browser spec signs in multiple users or creates and reloads durable data.