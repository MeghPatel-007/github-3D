# GitHub 3D — Specification-Driven Architecture

This folder is the source of truth for planning and implementing GitHub 3D: **Code as a World**.

## Product mission and flow

The target is a fully working, GitHub Desktop-style Git client with a 3D-first repository workspace and synchronized 2D controls. Read-only exploration is an early milestone; the full workflow includes repository open/clone, branch management, changes/diffs, staging, commits, remote sync, conflict recovery, and history. See `25-implementation-task-breakdown.md` for its capability gates.

1. A visitor opens a conventional 2D landing page.
2. They authenticate with GitHub.
3. They arrive at a 2D repository dashboard.
4. They select an accessible repository or import a public repository URL.
5. The application loads a consistent repository revision and builds a normalized model.
6. The user enters an immersive 3D repository world.
7. They explore directories and files, inspect source, and follow detected dependencies.
8. The user reviews/stages changes, commits, synchronizes, recovers from conflicts, and explores history.

## Documents

| File | Purpose |
|---|---|
| `01-product-requirements.md` | Product goals, personas, scope, user journeys, functional and non-functional requirements |
| `02-system-architecture.md` | System boundaries, components, data flows, deployment, and trust boundaries |
| `03-authentication-and-security.md` | GitHub OAuth, token handling, permissions, threat model, privacy |
| `04-repository-data-and-api.md` | GitHub API strategy, normalized data model, loading, caching, error handling |
| `05-three-d-world-and-interactions.md` | Spatial layout, scene rules, navigation, selection, accessibility |
| `06-code-analysis-and-dependencies.md` | Import analysis, resolution, symbol references, accuracy requirements |
| `07-commit-history.md` | Commit timeline and revision comparison requirements for the full product |
| `08-implementation-plan.md` | Phased implementation plan, milestones, and definition of done |
| `09-testing-and-acceptance.md` | Test strategy, acceptance criteria, and release gates |
| `10-decisions-and-open-questions.md` | Architectural decisions, tradeoffs, and unresolved product choices |
| `11-3d-rendering-and-scene-models.md` | Scene graph, procedural models, geometry, materials, labels, optional assets |
| `12-physics-and-spatial-layout.md` | Deterministic layout, spatial settings, and when physics is or is not appropriate |
| `13-camera-controls-and-input.md` | Camera controller choice, input mapping, focus behavior, presets |
| `14-controls-settings-and-user-preferences.md` | User settings, debug controls, defaults, persistence |
| `15-state-management-and-interaction-contracts.md` | Shared state ownership and cross-view interaction rules |
| `16-performance-budget-and-optimization.md` | Provisional budgets, profiling, optimization, graceful degradation |
| `17-accessibility-responsive-and-motion.md` | Keyboard access, 2D alternatives, responsive layout, reduced motion |
| [`design/design.md`](design/design.md) | Primary GitHub 3D journey, immersive workspace composition, visual language, and accessibility guidance |
| `25-implementation-task-breakdown.md` | Full GitHub Desktop-style capability roadmap and release gates |
| `26-spatial-git-workflows.md` | Ralph handoff for connecting managed Git operations to the world-space IWSDK panel |

## Specification rules

- Requirements use stable IDs such as `FR-AUTH-01` and `NFR-PERF-01`.
- A requirement is not complete until it has implementation evidence and a test or documented reason why it cannot be automated.
- The repository revision (commit SHA) is part of the identity of a loaded model. Do not mix tree data, file content, dependency results, or history from different revisions.
- Do not fabricate metadata, dependency edges, symbol references, or commit changes.
- The 3D world is an interface over repository data, not the canonical source of truth.
- Keep the 2D file tree and source inspector usable if WebGL is unavailable.
- Read-only exploration is an early milestone, not the final product gate.
- Do not claim desktop-style capability until each workflow in the roadmap is implemented and verified.

## Active project stack

- TypeScript + Vite using the existing IWSDK project scaffold.
- `@iwsdk/core` for Three.js, ECS, spatial runtime, and scene integration; UIKitML/DOM for panels and accessible 2D controls.
- Node.js API for the current auth/session and protected GitHub API boundary.
- GitHub REST API for remote metadata; a separate Git engine/workspace decision is required for full local Git behavior.
- Node's built-in test runner, TypeScript typecheck, and the configured build scripts.

Do not introduce a second renderer stack or assume GitHub REST endpoints alone provide a local Git repository workflow. The active architecture decisions in `10-decisions-and-open-questions.md` supersede older proposed-stack text.
