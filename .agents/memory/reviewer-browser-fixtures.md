---
name: Reviewer browser fixtures
description: Reliability constraints for browser tests that create Clerk reviewer users.
---

Clerk reviewer browser tests must scope multi-result searches to the current run and must not assume a specific user sorts onto the first unfiltered page or that the total count only includes the current fixtures.

**Why:** Clerk user fixtures from earlier runs can remain visible temporarily or be shared with the same development tenant, and user ordering is not stable enough for exact first-page assertions.

**How to apply:** Use the current run identifier for searches that need a known result count; after clearing a search, assert the page number, URL parameters, and presence of generic reviewer controls rather than a particular user or total. When checking access history, filter rows to the current target before asserting a count because the audit log is shared across fixtures.

Clerk fixture creation is rate-limited during repeated broad browser-suite runs; prefer focused specs and avoid unnecessary fixture churn when validating a single scenario.

**Why:** A full-suite retry can create dozens of users before reaching the target test and hit Clerk’s request limit, masking the scenario under test.

**How to apply:** Run the smallest relevant Playwright grep while iterating on reviewer pagination, and add bounded retry/backoff before making fixture setup broader.