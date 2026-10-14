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
