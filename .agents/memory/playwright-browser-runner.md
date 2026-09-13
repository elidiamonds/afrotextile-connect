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