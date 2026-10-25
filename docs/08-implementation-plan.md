# 08 — Implementation Plan

## 1. Execution strategy

Build a thin vertical slice first: GitHub sign-in → repository selection → 3D workspace → file inspection. Then establish the Git engine/workspace architecture and deliver actual desktop-client workflows in small verified slices. Dependency analysis is valuable but must not displace core Git operations. The first read-only slice is a milestone, not the finished product.

## 2. Phase 0 — Project foundation

Deliverables:
- Preserve the existing IWSDK + TypeScript + Vite foundation and use its project scripts.
- Keep type checking, tests, and build reproducible from a clean checkout.
- Establish environment variable conventions.
- Create app shell, route boundaries, and error handling.
- Add a sample repository fixture for development without API dependency.

Exit criteria:
- Clean build and type check.
- Basic routes render.
- Test command works in CI/local development.

## 3. Phase 1 — 2D product and authentication

Deliverables:
- Landing page.
- GitHub sign-in flow.
- Secure backend callback and session handling.
- Dashboard loading, signed-out, signed-in, and error states.
- Logout.

Exit criteria:
- State validation is tested.
- No client-side secrets.
- User can sign in and return to the dashboard.
- Authorization denial and expired session are handled.

## 4. Phase 2 — Repository import and normalized model

Deliverables:
- Repository URL validation.
- Accessible repository list/search.
- Public URL import.
- Metadata and revision resolution.
- Tree fetching, truncation handling, and normalization.
- Revision-scoped caching.

Exit criteria:
- A known test repository loads.
- Tree nodes have correct parent paths.
- Content requests use the same commit SHA.
- Errors and retry work.

## 5. Phase 3 — Basic 3D world

Deliverables:
- Repository hub and directory regions.
- File objects and labels.
- Camera orbit/zoom/pan.
- Selection, focus, and reset.
- 2D file tree synchronized with selection.
- Dashboard-to-world transition.
- WebGL fallback.

Exit criteria:
- User can navigate a real repository.
- Selection in tree and scene stays synchronized.
- The scene is revision-consistent.
- Performance is measured against the initial target.

## 6. Phase 4 — Inspector and search

Deliverables:
- File metadata inspector.
- On-demand source fetching.
- Syntax highlighting.
- Path/name search and filters.
- Large/binary file fallback.

Exit criteria:
- Search result focuses the correct object.
- File content is revision-correct.
- Large and unsupported content is safe.

## 7. Phase 5 — Dependency analysis

Deliverables:
- Supported-language parser.
- Relative import resolver.
- Explicit unresolved edges.
- Directed edge rendering.
- Incoming/outgoing filters.
- Relationship inspector and legend.

Exit criteria:
- Fixture-based resolver tests pass.
- No false edges are fabricated.
- Analysis failure does not block browsing.

## 8. Phase 6 — Git engine and repository lifecycle

Deliverables:
- Record an architecture decision for Git execution and workspace storage before implementing writes.
- Support opening and cloning repositories using a real Git engine.
- Track working tree, index, HEAD, branches, remotes, and upstream state separately.
- Provide progress, cancellation boundaries, and recovery for interrupted operations.

Exit criteria:
- A clean session can open or clone a repository and read actual Git state.
- Workspace persistence, credential boundaries, and supported platforms are documented.
- No operation is represented as complete until the Git engine confirms it.

## 9. Phase 7 — Branches and working-tree operations

Deliverables:
- Create, switch, rename, and safely delete branches.
- Show changed, untracked, staged, and unstaged files with accurate diffs.
- Stage/unstage files or supported hunks; confirm discard operations.
- Create commits from staged changes and report verified commit identity.

Exit criteria:
- UI state matches real Git state after each operation.
- Unsafe branch switches and destructive discards protect local work.
- Commit validation and failure recovery are tested.

## 10. Phase 8 — Remote synchronization and recovery

Deliverables:
- Fetch, pull, and push with visible progress and verified results.
- Handle auth expiry, offline/network failures, divergent histories, and merge conflicts.
- Provide safe continue/abort flows for supported merge or rebase operations.

Exit criteria:
- A user can commit locally, sync with GitHub, and recover from supported conflicts without silent data loss.

## 11. Phase 9 — History, GitHub context, and 3D integration

Deliverables:
- Browse commits and compare revision-specific trees/diffs.
- Add scoped GitHub context such as repository/branch/commit links and explicitly selected pull-request workflows.
- Reflect branch and working-tree state in the 3D world and synchronize all scene and 2D controls.
- Keep all essential workflows accessible in the 2D fallback.

Exit criteria:
- Historical views are revision-correct and clearly separated from current local changes.
- Core workflows can be completed through the 3D-first experience and the 2D controls.

## 12. Phase 10 — Complete product hardening

Deliverables:
- Scene visual polish.
- First-run hints and reduced motion.
- Responsive 2D fallback.
- Error-state audit.
- Browser-level end-to-end tests.
- README, architecture docs, and demo script.

Exit criteria:
- The complete supported Git workflow is demonstrated: sign-in, repository create/open/clone, branch/change review, stage/commit, sync, conflict recovery, history, and pull-request context.
- Essential workflows work through the 3D-first experience and keyboard-accessible 2D fallback.
- Key failure paths, permissions, local-data protections, and known support limits are tested and documented.
- No critical credential exposure, silent data loss, or data-consistency defects remain.

## 13. Later enhancements beyond the core desktop-style gate

- Function/class definitions and references.
- More languages and resolution rules.
- Semantic symbol references and call-site tracing.
- Optional physics interactions after usability validation.
- Advanced hosted collaboration only after its product scope and permissions are explicit.
- Persisted recents/preferences.
- Large-repository optimization and analysis jobs.

## 14. Suggested issue labels

- `spec`: requirement clarification
- `frontend`
- `backend`
- `auth-security`
- `repository-data`
- `3d-scene`
- `analysis`
- `testing`
- `performance`
- `later-enhancement`

Every implementation task should reference requirement IDs and have explicit acceptance criteria. The complete release gate is the supported Git workflow matrix in `docs/25-implementation-task-breakdown.md`, not merely the first read-only explorer milestone.
