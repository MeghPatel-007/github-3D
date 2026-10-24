# 08 — Implementation Plan

## 1. Execution strategy

Build a thin vertical slice first: 2D landing → GitHub authentication → repository dashboard → repository import → normalized tree → 3D scene → file inspection. Then add dependency analysis. Avoid implementing all modules in parallel before their interfaces are tested.

## 2. Phase 0 — Project foundation

Deliverables:
- Initialize React + TypeScript + Vite.
- Configure linting, formatting, type checking, and tests.
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

## 8. Phase 6 — Demo polish and hardening

Deliverables:
- Scene visual polish.
- First-run hints and reduced motion.
- Responsive 2D fallback.
- Error-state audit.
- Browser-level end-to-end tests.
- README, architecture docs, and demo script.

Exit criteria:
- Complete happy path demonstrated from sign-in to code inspection.
- Key failure paths tested.
- No critical credential exposure or data-consistency defects.

## 9. Post-MVP

- Function/class definitions and references.
- Commit timeline and structural diff.
- More languages and resolution rules.
- Private repository support improvements.
- Persisted recents/preferences.
- Large-repository optimization and analysis jobs.

## 10. Suggested issue labels

- `spec`: requirement clarification
- `frontend`
- `backend`
- `auth-security`
- `repository-data`
- `3d-scene`
- `analysis`
- `testing`
- `performance`
- `post-mvp`

Every implementation task should reference requirement IDs and have explicit acceptance criteria.
