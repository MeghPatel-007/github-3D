# 09 — Testing and Acceptance

## 1. Test layers

### Unit tests
- URL parser and validator
- Tree normalization and path handling
- Revision-aware cache keys
- Dependency parser and resolver
- Layout determinism and coordinate generation
- Structural diff algorithm

### Integration tests
- Backend session validation
- OAuth callback state validation
- GitHub API client error mapping
- Repository tree retrieval and truncation fallback
- Content retrieval bound to the active SHA
- Cache isolation across authorization scopes

### Component tests
- Landing page CTA
- Repository search and selection
- Import progress/error states
- File tree selection
- Inspector source/error states
- Search-to-scene focus behavior

### End-to-end tests
- Sign in using a controlled test strategy or mocked provider flow.
- Select/import a known repository.
- Enter the 3D world.
- Select a file.
- Inspect source.
- Search for another file and focus it.
- Trigger an invalid URL and verify a useful error.
- Verify 2D fallback behavior when WebGL is unavailable or mocked as failed.

## 2. Test fixtures

Maintain a small repository fixture containing:
- Root-level files.
- Nested directories.
- Dotfiles and extensionless files.
- Known relative imports.
- A missing import.
- A supported alias configuration.
- An unsupported source file.
- A large/binary fixture represented safely.
- A directory with enough nodes to test collapse/label behavior.

Expected tree nodes and dependency edges should be checked into tests so results are deterministic.

## 3. Acceptance checklist

### Product flow
- [ ] Landing page is usable without authentication.
- [ ] GitHub authorization can start and finish.
- [ ] Authorization denial and session expiry are handled.
- [ ] Dashboard lists accessible repositories.
- [ ] Public URL import validates input.
- [ ] Loading and retry states work.

### Repository model
- [ ] Active model stores commit SHA.
- [ ] Tree parent-child paths are correct.
- [ ] Truncated responses are handled.
- [ ] File content is fetched on demand.
- [ ] Tree, content, and analysis use the same revision.
- [ ] Stale requests are ignored after repository switches.

### 3D world
- [ ] Files and folders render correctly.
- [ ] Camera controls and reset work.
- [ ] Scene and file tree selection stay synchronized.
- [ ] Labels remain usable at expected zoom levels.
- [ ] Large subtrees can be collapsed/hidden.
- [ ] WebGL failure does not make the product unusable.
- [ ] Performance is measured on representative hardware.

### Inspector/search
- [ ] Search by name and path works.
- [ ] Search result focuses the correct object.
- [ ] Source loads with syntax highlighting.
- [ ] Binary/oversized files are handled safely.
- [ ] GitHub source link points to the active revision where possible.

### Dependencies
- [ ] Supported imports resolve in fixtures.
- [ ] Missing imports are marked unresolved.
- [ ] Edge direction is correct.
- [ ] Containment is visually distinct from imports.
- [ ] Unsupported language results are not presented as complete analysis.

### Security
- [ ] No secrets in frontend bundle.
- [ ] Protected API routes require a valid session.
- [ ] Repository access is checked server-side.
- [ ] User-controlled URLs cannot trigger arbitrary backend fetches.
- [ ] Source is rendered as text and never executed.
- [ ] Logs redact tokens and session secrets.

## 4. Performance test protocol

- Record device/browser, repository fixture, visible object count, edge count, and enabled effects.
- Measure scene initialization time, interaction responsiveness, and sustained frame rate.
- Test with labels and edges enabled and disabled.
- Test collapsing a large subtree.
- Record memory/resource behavior when switching repositories repeatedly.
- Confirm Three.js resources are disposed of when no longer needed.

The initial 30+ FPS target for around 500 visible objects is a benchmark target, not a universal guarantee. Publish the tested conditions with any performance claim.

## 5. Release gate

Do not call the MVP complete if authentication exposes credentials, the model mixes revisions, source inspection is unreliable, search focuses the wrong object, dependency edges are fabricated, or the app becomes unusable when WebGL fails.

## 6. Current release evidence

Snapshot from 2026-10-26. “Automated” means local fixture/API tests; it does not
mean a live GitHub account or browser workflow was exercised.

| Requirement | Evidence gathered | Status and remaining gap |
|---|---|---|
| FR-GIT-01 — Open/clone workspace | Git-backed tests cover init/open, clone, failure cleanup, and cancellation. | Automated local fixtures pass; a live authorized GitHub clone and browser progress path were not exercised. |
| FR-GIT-02 — Repository, branch, HEAD, sync state | Workspace snapshot and branch APIs expose these values; branch UI dispatches confirmed state to the scene header. | API/source evidence passes; live managed-workspace display remains unverified. |
| FR-GIT-03 — Branch management | Tests cover create/list/switch/rename/delete constraints, dirty checkout, checked-out deletion, and unmerged branches. | Automated local fixtures pass. |
| FR-GIT-04 — Change status | Tests cover untracked, added, modified, renamed, deleted and staged/unstaged states. | Automated local fixtures pass; 3D objects do not yet show per-file Git status. |
| FR-GIT-05 — Diff safety | Tests cover staged/unstaged diffs and binary handling; code bounds and marks truncated/unsupported output. | File diffs pass; hunk diff is unsupported. |
| FR-GIT-06 — Stage/unstage/discard | Tests cover file-level stage/unstage and explicit discard confirmation. | Automated local fixtures pass; hunk staging is unsupported. |
| FR-GIT-07 — Commit | Tests cover staged-only commits, invalid identity, empty index, and hook failure. | Automated local fixtures pass. |
| FR-GIT-08 — Remote sync | Tests cover fetch, fast-forward pull, push, denial, divergence, and confirmed result state. | Automated local fixtures pass; pull is fast-forward-only and live remote auth was not exercised. |
| FR-GIT-09 — Conflicts | Tests cover merge conflict inspection and explicit abort/continue without overwriting files. | Automated local fixtures pass; rebase recovery is unsupported. |
| FR-GIT-10 — History/comparison | Tests cover bounded history and revision path comparison without mutating workspace state. | Automated local fixtures pass. |
| FR-GIT-11 — GitHub context/PR | API tests cover repository/branch/commit links and pull-request validation/context. | Automated mocked/local coverage passes; live PR creation was not exercised. |
| FR-GIT-12 — Synchronized views | Shared selection events and a workspace branch/HEAD/status summary are present; screenshot shows the demo scene. | Partial. Git operation controls currently live in the DOM overlay, not the spatial UIKitML panel. Managed-workspace interactions and per-file 3D status are not verified. Follow `docs/26-spatial-git-workflows.md`. |
| FR-GIT-13 — Keyboard/2D/WebGL fallback | Semantic HTML controls and focus styles are present. | Partial/unverified. No keyboard-only workflow or WebGL-failure run was performed. |
| Security and accessibility | Auth/session, access denial, mutation safety, and token boundary tests pass; reduced-motion CSS is present. | Source and automated evidence only; no live auth review, keyboard audit, or permission revocation browser path was exercised in this session. |
| Performance | Scene node count is capped at 500. | Unverified. The cap is not a measured FPS/memory result; no representative workspace benchmark was run. |
| Build and automated tests | App TypeScript check passes; production Vite build passes to a writable temporary output directory; 31 JavaScript tests and 6 TypeScript tests pass (2 platform-specific tests skipped). | Checks pass with caveats: default `dist/` output is blocked by the sandbox; build warns about a large chunk; full browser E2E and live auth are not verified. |

The release gate remains open until the partial and unverified items above have
appropriate runtime evidence. Do not mark TASK-14 or TASK-15 complete based on
fixture rendering, source inspection, or server tests alone.
