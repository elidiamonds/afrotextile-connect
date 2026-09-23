---
name: Mobile hero text clarity
description: How to assess and prevent perceived text blur over the Afrotextile home hero on small screens.
---

Reports of blurry mobile hero text may come from a bright image showing through behind the lettering and thin inherited font smoothing, even when no CSS blur applies to the text.

**Why:** Removing transform and opacity animations did not resolve the reported mobile softness. A target-width capture showed that image detail remained visible directly behind the headline and body copy.

**How to apply:** Verify at a mobile viewport. Keep the small-screen hero image subdued, use a strong background-colored overlay, avoid translucent text colors for primary copy, and override thin font smoothing on the home surface when needed.