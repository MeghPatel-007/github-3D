# SDK and Dependency Matrix

**Status:** Proposed baseline  
**Project:** GitHub 3D: Code as a World

## 1. Purpose

Record the initial implementation stack, explain why each dependency exists, and prevent unnecessary library churn. Versions should be pinned in the package manager lockfile and checked against official compatibility guidance at implementation time.

## 2. Proposed stack

| Area | Choice | Responsibility | Required for MVP? |
|---|---|---|---|
| Language | TypeScript | Shared types and safer refactoring | Yes |
| Web app | React + Vite | UI, development server, production build | Yes |
| Styling | Tailwind CSS | Layout and visual styling | Recommended |
| 3D engine | Three.js | WebGL rendering primitives | Yes |
| React 3D binding | React Three Fiber | Declarative Three.js scene | Yes |
| 3D helpers | Drei | Camera controls, loaders, helpers | Recommended |
| Data fetching | TanStack Query | Request cache, retries, loading states | Recommended |
| Routing | React Router | Landing, dashboard, repository workspace | Recommended |
| Server | Node.js + Fastify or Express | OAuth callback, sessions, GitHub proxy | Yes for private/authenticated access |
| GitHub integration | GitHub REST API | Repositories, trees, contents, commits | Yes |
| Parsing | TypeScript compiler API; language-specific parsers as needed | Import and symbol analysis | Yes for TS/JS dependency edges |
| Unit tests | Vitest | Unit and component tests | Yes |
| UI tests | React Testing Library | User-facing component behavior | Recommended |
| End-to-end tests | Playwright | Login flow, repository import, scene interactions | Recommended |
| Validation | Zod or equivalent | Runtime validation of API payloads | Recommended |
| Logging | Pino or equivalent | Structured server logs with redaction | Recommended |
| Error monitoring | Provider-neutral integration | Capture unexpected client/server errors | Before production |
| Physics | Rapier / React Three Rapier | Collision simulation | No; defer |
| State store | React state/context initially; Zustand if complexity grows | Shared UI and scene state | Optional |

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
