---
name: GitHub workspace sync
description: How to safely synchronize this workspace when the configured Git remote cannot authenticate.
---

Direct pushes to the configured GitHub origin are not authenticated in this workspace. Use the connected GitHub integration and its Git Data API to create blobs, build a tree from the current remote tree, create one sync commit, and update `main` without force.

**Why:** The GitHub connector has repository write access, while the HTTPS Git remote rejects authentication. A non-forced ref update also prevents overwriting a remote change that arrived during synchronization.

**How to apply:** Compare the remote branch tree with the tracked local `HEAD`, upload only added or modified blobs, include deletions as null tree entries, verify the remote head has not changed, then create the commit and patch `refs/heads/main` with `force: false`.