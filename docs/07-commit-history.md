# 07 — Commit History and Revision Comparison

## 1. Goal

Let users navigate a repository's evolution as a visual timeline and compare structural changes between revisions. History is part of the complete GitHub Desktop-style product target, after reliable repository and working-tree operations are in place. Its later sequencing does not make it out of scope.

## 2. Requirements

- **FR-HIST-01:** Retrieve commit metadata for the selected repository/ref.
- **FR-HIST-02:** Show commit SHA, author where available, date, and message.
- **FR-HIST-03:** Retrieve changed-file information for a selected commit when available.
- **FR-HIST-04:** Select a commit and build a model bound to that commit SHA.
- **FR-HIST-05:** Identify added, modified, renamed, and deleted paths when the API data supports those classifications.
- **FR-HIST-06:** Compare two revisions using normalized paths and revision-aware identities.
- **FR-HIST-07:** Animate structural differences without implying that the animation represents runtime execution.
- **FR-HIST-08:** Handle unavailable commits, shallow/inaccessible history, pagination, and rate limits.

## 3. Timeline interaction

- Timeline shows commits in a clear chronological/revision order.
- Selecting a commit previews its metadata and change summary.
- Applying a commit changes the active revision explicitly.
- Current revision is visibly identified.
- The user can return to the latest/default-branch revision.
- The user can compare a selected revision with another revision.

## 4. Structural diff

Compute differences from revision-specific tree models:
- Added path
- Removed path
- Modified path/content SHA where available
- Renamed path when evidence supports it
- Added or removed dependency edges when both revisions were analyzed

Do not infer rename semantics from name similarity alone. If rename information is unavailable, present a removal and addition rather than a false certainty.

## 5. Data integrity

Each timeline selection must create or load a separate revision-scoped model. Never mutate a current-revision model in place with historical content. Cache keys include repository, commit SHA, and analysis version/configuration.

## 6. Acceptance criteria

- Selecting a commit loads the correct revision.
- Changed paths match API/tree evidence.
- Deleted files are absent in the selected later revision.
- The user can return to the active branch revision.
- Unavailable history produces an error while preserving the currently loaded world.
- Structural animation is optional and can be skipped.
