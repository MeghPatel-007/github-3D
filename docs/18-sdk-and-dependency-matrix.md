# SDK and Dependency Matrix

**Status:** Proposed baseline  
**Project:** GitHub 3D: Code as a World

## 1. Purpose

Record the initial implementation stack, explain why each dependency exists, and prevent unnecessary library churn. Bun is the only package manager; `bun.lock` is authoritative. Versions should be checked against official compatibility guidance at implementation time.

## 2. Proposed stack

| Area | Choice | Responsibility | Required for MVP? |
|---|---|---|---|
| Language | TypeScript | Shared types and safer refactoring | Yes |
| Web app | Vite | Development server and production build | Yes |
| Application and 3D | IWSDK (`@iwsdk/core`) + Three.js | ECS app shell, scene graph, input, rendering | Yes |
| Styling | UIKitML for spatial panels; CSS for DOM overlays | Layout and visual styling | Yes |
| 3D helpers | IWSDK built-ins (`RayInteractable`, camera rig, assets) | Selection, camera, asset loading | Yes |
| Data fetching | Native `fetch` plus an explicit revision-scoped cache | Request cache, retries, loading states | Yes |
| Routing | In-app view state for the MVP | Landing, dashboard, repository workspace | Yes |
| Server | Node.js + Fastify or Express | OAuth callback, sessions, GitHub proxy | Yes for private/authenticated access |
| GitHub integration | GitHub REST API | Repositories, trees, contents, commits | Yes |
| Parsing | TypeScript compiler API; language-specific parsers as needed | Import and symbol analysis | Yes for TS/JS dependency edges |
| Unit tests | Node.js test runner with type stripping | Unit tests for model, layout, analysis | Yes |
| UI tests | Playwright | User-facing behavior and scene interactions | Recommended |
| Validation | Zod or equivalent | Runtime validation of API payloads | Recommended |
| Logging | Pino or equivalent | Structured server logs with redaction | Recommended |
| Error monitoring | Provider-neutral integration | Capture unexpected client/server errors | Before production |
| Physics | None for MVP | Collision simulation | No; defer |
| State store | Explicit ECS components and small module stores | Shared UI and scene state | Yes |

## 3. Dependency rules

1. Prefer a small set of well-supported dependencies over multiple overlapping libraries.
2. Use one primary routing library, one server framework, and one schema-validation strategy.
3. Keep rendering components separate from GitHub API access and source-code analysis.
4. Avoid putting tokens, OAuth secrets, or privileged credentials in client bundles.
5. Pin exact versions through the lockfile; use compatible version ranges in `package.json` according to team policy.
6. Review release activity, license, security advisories, bundle impact, and browser support before adding a dependency.
7. Do not add a physics engine merely to position repository nodes; use deterministic layout first.
8. Avoid loading every source file into the browser. Analyze only bounded, relevant content.

## 4. Suggested workspace packages

```text
apps/
  web/                 # React/Vite frontend
  api/                 # Node.js backend
packages/
  shared/              # API schemas and shared TypeScript types
  repo-analysis/       # Tree normalization and dependency extraction
  scene-model/         # Deterministic 3D layout and graph conversion
```

A monorepo is optional. For a small hackathon prototype, a single repository with `client/`, `server/`, and `shared/` can be simpler.

## 5. Integration boundaries

- `web` calls the application API, not privileged GitHub endpoints with server secrets.
- `api` owns authentication callbacks, session handling, authorization checks, rate-limit handling, and GitHub API calls.
- `repo-analysis` accepts a revision-scoped repository snapshot and emits normalized dependency records.
- `scene-model` converts normalized tree and dependency records into positions, node types, and edge metadata.
- `shared` defines request/response schemas without importing UI or rendering code.

## 6. Version and upgrade policy

- Commit the lockfile.
- Upgrade one major dependency family at a time.
- Run type checking, unit tests, end-to-end smoke tests, and a representative 3D performance test after upgrades.
- Record breaking changes and migration notes in the pull request.
- Verify official docs for React, Three.js, React Three Fiber, GitHub API, and the selected server framework before fixing versions.

## 7. Acceptance criteria

- The stack is recorded in the repository README.
- Every direct dependency has a stated purpose.
- Client bundles contain no server secrets.
- The app can be installed reproducibly from a clean checkout.
- CI can run lint/type-check/test/build commands without manual local setup.
