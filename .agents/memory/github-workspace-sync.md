---
name: GitHub workspace sync
description: How to safely synchronize this workspace when the configured Git remote cannot authenticate.
---

Direct pushes to the configured GitHub origin are not authenticated in this workspace. Use the connected GitHub integration and its Git Data API to create blobs, build a tree from the current remote tree, create one sync commit, and update `main` without force.

**Why:** The GitHub connector has repository write access, while the HTTPS Git remote rejects authentication. A non-forced ref update also prevents overwriting a remote change that arrived during synchronization.

**How to apply:** Compare the remote branch tree with the tracked local `HEAD`, upload only added or modified blobs, include deletions as null tree entries, verify the remote head has not changed, then create the commit and patch `refs/heads/main` with `force: false`.

Build the local tree listing through a temporary file and read that file back instead of parsing a large `shellExec` result directly. Read base64 blob data in small verified chunks before uploading, and confirm the generated GitHub tree SHA equals `HEAD^{tree}` before creating the commit.

**Why:** Code-execution shell output can silently omit part of a long tree listing or truncate a large single-line base64 payload even when the requested output budget appears sufficient. The resulting partial data can look like a valid but destructive diff.

**How to apply:** Check the listing count against `git ls-tree -r --name-only HEAD | wc -l`, verify each reconstructed blob’s decoded byte count and returned SHA, and treat a tree-SHA mismatch as a hard stop before commit creation.