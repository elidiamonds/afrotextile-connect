---
name: Expo web font gating
description: Expo web preview can remain blank when the Google-font hook never resolves or the package hook loads a second React copy.
---

Keep the native font-loading gate and splash handling, but allow the web renderer to use its system-font fallback when the font loader does not resolve. Prefer Expo's built-in font hook over a package-provided hook when the preview reports invalid-hook-call errors.

**Why:** The managed Expo web preview can bundle a package-provided font hook differently from the app's React instance, and font loading may also never complete in the browser even though native startup is healthy.

**How to apply:** When changing Expo root layout or font dependencies, run Expo Doctor, test the managed web preview, and preserve a web-specific ready path rather than leaving the whole app behind a permanent splash gate.