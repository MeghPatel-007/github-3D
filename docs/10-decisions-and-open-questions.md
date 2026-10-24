# 10 — Decisions and Open Questions

## 1. Decisions recommended for the first release

### D-001: One web application with distinct 2D and 3D areas
**Decision:** Use a single React application with route/component boundaries for landing, dashboard, and 3D world.  
**Reason:** Shared session, selection, repository model, and navigation state are easier to maintain.

### D-002: Backend-mediated GitHub authorization
**Decision:** Use a small Node.js backend for authorization callback and protected token handling.  
**Reason:** Avoid exposing OAuth secrets or privileged tokens in browser code.

### D-003: Public import plus authorized repository selection
**Decision:** Support public repository URL import and list repositories visible through the current authorization.  
**Reason:** This supports the demo while respecting GitHub's permission model.

### D-004: Revision-scoped repository model
**Decision:** Bind all loaded tree/content/analysis data to a commit SHA.  
**Reason:** Branches move; source and dependency data must not silently become inconsistent.

### D-005: Hierarchical 3D layout
**Decision:** Use deterministic spatial groups based on directory hierarchy.  
**Reason:** The visual representation should teach repository structure rather than generate an arbitrary game world.

### D-006: Static dependency analysis first
**Decision:** Support a small language subset and explicit unresolved states before adding symbol tracing.  
**Reason:** Reliable imports are tractable; semantic call graphs are significantly harder.

### D-007: 2D fallback is mandatory
**Decision:** Keep a conventional file tree and inspector usable independently of WebGL.  
**Reason:** Accessibility, small screens, weak devices, and renderer failures must not block core use.

### D-008: History and symbol references are post-MVP
**Decision:** Defer these until the end-to-end repository journey is reliable.  
**Reason:** They increase complexity and are not required to validate the central product idea.

### D-009: IWSDK is the application and rendering stack
**Decision:** Build the app on the existing IWSDK scaffold: Vite + TypeScript, Three.js through `@iwsdk/core`, ECS systems, and UIKitML/DOM panels. React, React Three Fiber, and Drei are not used.  
**Reason:** The repository already ships an IWSDK app, IWSDK skills, and scoped project rules; adding a second renderer stack would duplicate scene ownership. A Node.js backend for OAuth and protected GitHub calls is unchanged by this decision.  
**Supersedes:** React/R3F stack lines in `02-system-architecture.md`, `11-3d-rendering-and-scene-models.md`, `13-camera-controls-and-input.md`, and `18-sdk-and-dependency-matrix.md`.

## 2. Open questions to resolve before production

- **Q-001:** Should login be mandatory to explore any repository, or should public repositories support guest mode? Recommended default: keep the landing page public, require GitHub sign-in for the main dashboard, and allow public URL import after sign-in.
- **Q-002:** Should the app use an OAuth App or GitHub App? Choose based on required repository permissions, installation model, and deployment needs; verify current GitHub guidance.
- **Q-003:** Which languages are required for the first demo? Recommended initial subset: JavaScript, TypeScript, JSX, and TSX.
- **Q-004:** What is the target repository size? Establish a tested budget for files, bytes analyzed, visible objects, and edges.
- **Q-005:** Should recent repositories persist across devices? If yes, define database and retention requirements; otherwise keep a local/session-level recent list.
- **Q-006:** Is private repository support required for the first public demo? Recommended default: defer unless the demo requires it.
- **Q-007:** Should the 3D world auto-open after parsing or require an explicit **Enter 3D World** action? Recommended default: explicit action on first use, with a remembered preference later.
- **Q-008:** What visual theme and motion intensity are preferred? Establish reduced-motion and low-effects modes regardless.
- **Q-009:** Which browsers and devices must be supported? Define a minimum browser/WebGL baseline and test it.
- **Q-010:** Is persistent analysis caching required? Start without durable source-content storage; add only when measured performance or scale requires it.

## 3. Risks

| Risk | Response |
|---|---|
| 3D is impressive but not useful | Keep search, tree, inspector, and actual dependency analysis central |
| Large repositories overwhelm browser | Bound scene objects, collapse subtrees, fetch content on demand |
| GitHub rate limits interrupt demo | Cache by SHA, reduce calls, provide progress and retry |
| Import resolution is inaccurate | Use AST parsing, test fixtures, and explicit unresolved states |
| OAuth takes too much hackathon time | Build a tested mocked flow early, then integrate real auth before release |
| Private token leaks | Server-side handling, secure cookies, redacted logs, security tests |
| Animation harms usability | Short, skippable transition and reduced-motion option |
| Scope grows uncontrollably | Enforce P0/P1/post-MVP release gates |

## 4. Change-control rule

When a requirement changes:
1. Update the relevant requirement document and stable requirement ID.
2. Update affected architecture/data contracts.
3. Add or adjust acceptance criteria.
4. Identify impacted implementation tasks and tests.
5. Record a decision if the change alters an architectural choice.

The spec should evolve with implementation evidence, but it should not silently drift away from the product goals.
