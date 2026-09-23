---
name: Shopify inventory location scope
description: Why vendor inventory forms must not mix aggregate variant stock with location-specific writes.
---

When a catalog editor writes inventory at one Shopify location, display and compare stock from that same location. Treat Shopify's variant-wide inventory quantity as an aggregate across locations, not as the value to write back to one location.

**Why:** On a multi-location store, copying a variant's aggregate quantity into one location duplicates stock from other locations on an otherwise unrelated edit. This can inflate availability and oversell.

**How to apply:** Resolve a stable managed location, use its inventory level for the form and optimistic comparison, verify that same level after writing, and label any aggregate total separately.