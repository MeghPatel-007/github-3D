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

### D-008: History is in the complete product target
**Decision:** Commit history and revision comparison are required for the complete desktop-style client, sequenced after reliable repository and working-tree workflows. Symbol references remain an advanced analysis feature.  
**Reason:** History is a normal part of understanding and operating on Git repositories; deferring its implementation does not remove it from the product mission.

### D-009: IWSDK is the application and rendering stack
**Decision:** Build the app on the existing IWSDK scaffold: Vite + TypeScript, Three.js through `@iwsdk/core`, ECS systems, and UIKitML/DOM panels. React, React Three Fiber, and Drei are not used.  
**Reason:** The repository already ships an IWSDK app, IWSDK skills, and scoped project rules; adding a second renderer stack would duplicate scene ownership. A Node.js backend for OAuth and protected GitHub calls is unchanged by this decision.  
**Supersedes:** React/R3F stack lines in `02-system-architecture.md`, `11-3d-rendering-and-scene-models.md`, `13-camera-controls-and-input.md`, and `18-sdk-and-dependency-matrix.md`.

### D-010: GitHub App for the initial read workflow
**Decision:** Use GitHub App user authorization with `Contents: read-only` and `Metadata: read-only` repository permissions for the initial browse/import milestone. Require installation on accounts whose private repositories users want to browse. Request expiring user tokens and use PKCE. Review and add narrowly scoped write permission only when a shipped feature requires it.  
**Reason:** GitHub Apps provide fine-grained permissions and short-lived user tokens, unlike broad OAuth App repository scopes. The API keeps tokens server-side. This initial permission set does not by itself fulfill the full Git-client product target.

### D-011: GitHub Desktop-style workflow is the product north star
**Decision:** Deliver a working Git client with a 3D-first repository workspace and a complete 2D route for core operations. The target includes opening/cloning repositories, branch management, change review, staging, commits, fetch/pull/push, conflict recovery, history, and related GitHub context.  
**Reason:** A read-only repository visualization is only an early milestone and does not satisfy the user's stated product goal.

### D-012: Decide Git execution and workspace storage before writes
**Decision:** No implementation approach for local Git execution or workspace storage is approved yet. Add an architecture decision record comparing browser-local, server-managed, and other feasible approaches against IWSDK/WebXR, security, platform access, durability, and deployment constraints before building write operations.  
**Reason:** GitHub's REST API alone does not provide a safe substitute for a full local Git workspace, and the choice changes authentication, persistence, deployment, and recovery boundaries.

## 2. Open questions to resolve before production

- **Q-001:** Should login be mandatory to explore any repository, or should public repositories support guest mode? Recommended default: keep the landing page public, require GitHub sign-in for the main dashboard, and allow public URL import after sign-in.
- **Q-002:** Resolved by D-010: use a GitHub App with read-only repository permissions and explicit installation.
- **Q-003:** Which languages are required for the first demo? Recommended initial subset: JavaScript, TypeScript, JSX, and TSX.
- **Q-004:** What is the target repository size? Establish a tested budget for files, bytes analyzed, visible objects, and edges.
- **Q-005:** Should recent repositories persist across devices? If yes, define database and retention requirements; otherwise keep a local/session-level recent list.
- **Q-006:** Is private repository support required for the first public demo? Recommended default: defer unless the demo requires it.
- **Q-007:** Should the 3D world auto-open after parsing or require an explicit **Enter 3D World** action? Recommended default: explicit action on first use, with a remembered preference later.
- **Q-008:** What visual theme and motion intensity are preferred? Establish reduced-motion and low-effects modes regardless.
- **Q-009:** Which browsers and devices must be supported? Define a minimum browser/WebGL baseline and test it.
- **Q-010:** Is persistent analysis caching required? Start without durable source-content storage; add only when measured performance or scale requires it.
- **Q-011:** Which Git engine/workspace model should power local repository operations? Resolve through D-012 before implementing clone, index, commit, or synchronization behavior.
- **Q-012:** Which GitHub Desktop workflows beyond core Git operations are required for the first complete release (for example, pull-request creation/viewing or issue links)? Track each as an explicit capability and permission instead of implying broad parity.

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
| Scope grows uncontrollably | Enforce milestone gates and keep the full product target explicit |

## 4. Change-control rule

When a requirement changes:
1. Update the relevant requirement document and stable requirement ID.
2. Update affected architecture/data contracts.
3. Add or adjust acceptance criteria.
4. Identify impacted implementation tasks and tests.
5. Record a decision if the change alters an architectural choice.

The spec should evolve with implementation evidence, but it should not silently drift away from the product goals.
