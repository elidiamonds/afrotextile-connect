---
name: Shopify Admin schema drift
description: Why catalog writes should be checked against the connected store's live Admin GraphQL schema.
---

Use the connected store's Admin GraphQL introspection before writing catalog mutations rather than assuming generic Shopify examples match its pinned API version.

**Why:** The live connector's API version differed from common examples in mutation argument names, collection membership operations, media error fields, and inventory quantity comparisons. These differences fail at runtime even when TypeScript passes.

**How to apply:** For future Shopify Admin catalog changes, inspect mutation arguments, input fields, enum values, and payload error fields via the Replit connector proxy. Never probe mutation behavior by writing to the merchant's catalog without an explicit test plan.