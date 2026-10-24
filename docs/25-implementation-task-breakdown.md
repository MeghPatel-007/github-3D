# Implementation Task Breakdown

**Status:** Proposed backlog  
**Project:** GitHub 3D: Code as a World

## 1. Delivery strategy

Build a thin end-to-end vertical slice first: demo fixture → normalized tree → 3D scene → select file → source inspector. Add GitHub authentication and live repository import after the core experience works. This separates visualization risks from OAuth and API integration risks.

## 2. Epics and tasks

### Epic A — Project foundation
- [ ] A1. Initialize TypeScript app, formatting, lint, type-check, test, and build scripts.
- [ ] A2. Add shared domain types and runtime schemas.
- [ ] A3. Add environment validation and `.env.example`.
- [ ] A4. Add CI checks and a clean-checkout setup guide.
- [ ] A5. Add error boundary and consistent loading/error components.

**Acceptance:** a clean checkout installs, tests, type-checks, and builds using documented commands.

### Epic B — Demo data and repository model
- [ ] B1. Create `tiny-ts` fixture and manifest.
- [ ] B2. Normalize directory/file nodes with stable IDs.
- [ ] B3. Implement parent-child relationships and path lookup.
- [ ] B4. Add deterministic unit tests for tree normalization.
- [ ] B5. Add revision SHA to every imported model.

**Acceptance:** fixture produces stable, revision-scoped nodes and correct hierarchy.

### Epic C — 3D workspace
- [ ] C1. Build scene canvas and camera controls.
- [ ] C2. Render directories and files with distinct shapes.
- [ ] C3. Add deterministic hierarchical spatial layout.
- [ ] C4. Implement hover, select, focus, and reset-camera behavior.
- [ ] C5. Add node labels or a details panel without excessive scene clutter.
- [ ] C6. Add node/edge visibility limits and a 2D fallback.
- [ ] C7. Test scene behavior with mouse, keyboard, and touch where supported.

**Acceptance:** users can navigate a fixture, select nodes, and recover from dense or unsupported scenes.

### Epic D — Inspector and search
- [ ] D1. Build file/folder inspector.
- [ ] D2. Add safe, bounded source viewer.
- [ ] D3. Add filename/path search.
- [ ] D4. Focus a search result in the scene and expose it in the 2D tree.
- [ ] D5. Show truncated or unavailable source content honestly.

**Acceptance:** users can find a file and inspect its metadata/content without relying solely on spatial navigation.

### Epic E — Dependency analysis
- [ ] E1. Parse supported JS/TS import syntax.
- [ ] E2. Resolve relative imports using documented extension/index rules.
- [ ] E3. Classify external, unresolved, unsupported, and resolved edges.
- [ ] E4. Add edge visibility filters and a legend.
- [ ] E5. Add tests for cycles, missing files, aliases, and unsupported syntax.
- [ ] E6. Show analysis coverage and file limits.

**Acceptance:** every rendered dependency edge comes from analysis output and carries a resolution status.

### Epic F — GitHub authentication and API
- [ ] F1. Choose OAuth or GitHub App based on required access and current platform guidance.
- [ ] F2. Implement secure login callback and session lifecycle.
- [ ] F3. Implement repository listing.
- [ ] F4. Implement import and resolve requested ref to commit SHA.
- [ ] F5. Fetch normalized tree at that SHA.
- [ ] F6. Fetch bounded source content at that SHA.
- [ ] F7. Handle upstream errors, rate limits, retries, and cancellation.
- [ ] F8. Add authorization tests for private repositories.
- [ ] F9. Add logout and session-expiry handling.

**Acceptance:** an authorized user can import an accessible repository without exposing credentials to the browser.

### Epic G — Reliability and release
- [ ] G1. Add request IDs, structured logs, and secret redaction.
- [ ] G2. Add API contract tests.
- [ ] G3. Add Playwright smoke tests for demo import and workspace interactions.
- [ ] G4. Benchmark representative scene sizes and set evidence-based limits.
- [ ] G5. Verify responsive behavior, reduced motion, and keyboard access.
- [ ] G6. Configure HTTPS, secure cookies, CORS, CSP, and secret management.
- [ ] G7. Document deployment and rollback.
- [ ] G8. Prepare a scripted demo path and known limitations.

**Acceptance:** release candidate passes required tests and has documented security/performance limitations.

### Epic H — Later features (not MVP blockers)
- [ ] H1. Symbol and function definitions.
- [ ] H2. Reference/call-site tracing.
- [ ] H3. Commit timeline navigation.
- [ ] H4. Saved layouts and user preferences.
- [ ] H5. Additional languages and configurable parser support.
- [ ] H6. Optional physics interactions after usability validation.

## 3. Recommended order

1. A1–A5: foundation.
2. B1–B5: deterministic model.
3. C1–C7: 3D vertical slice.
4. D1–D5: usable exploration.
5. E1–E6: truthful dependency graph.
6. F1–F9: live GitHub integration.
7. G1–G8: release hardening.
8. H features only after MVP acceptance.

For a short hackathon, keep authentication and repository import simple, support a deliberately limited language subset, and prioritize a polished working demo over speculative advanced features.

## 4. Definition of done

A task is done when:
- Acceptance criteria pass.
- Types and runtime validation are updated.
- Tests cover success and relevant failure cases.
- Loading, empty, and error states are handled.
- Security and accessibility implications are reviewed.
- Documentation is updated where behavior or configuration changed.
- The implementation does not overstate analysis completeness.
