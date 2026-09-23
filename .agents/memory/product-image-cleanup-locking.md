---
name: Product image cleanup locking
description: Concurrency rule for managed product image references and storage deletion
---

Managed product image saves and cleanup must coordinate with the same transaction-scoped PostgreSQL advisory lock derived from the image path. Cleanup holds that lock through both the final reference check and the storage deletion.

**Why:** A database reference can commit after an unlocked cleanup check but before storage deletion, leaving a saved product pointing at a deleted object.

**How to apply:** Acquire the image-path lock inside every product-save transaction before committing a managed image reference. Cleanup retries and other managed-image deletion paths must acquire the same lock and keep it until the storage operation completes.