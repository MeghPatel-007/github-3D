# 02 — System Architecture

## 1. Architecture principles

1. **GitHub is the source of truth.** Do not duplicate source code or repository state without a defined need.
2. **Revision consistency is mandatory.** A loaded repository model is bound to a commit SHA.
3. **2D first, 3D after selection.** The 3D scene is a feature area of the same web application.
4. **Separate data from presentation.** Scene coordinates are derived from repository data and are not canonical metadata.
5. **Secure privileged access server-side.** OAuth secrets and protected tokens must not be exposed to the browser.
6. **Progressive enhancement.** Repository navigation remains useful when WebGL is unavailable.
7. **Truthful analysis.** Unresolved imports and unsupported semantics must remain explicit.
8. **Real Git state.** Branch, index, working-tree, and remote operations must come from a real Git engine; the scene is a view over this state.
9. **Desktop workflow parity by increments.** Read-only exploration is the first milestone. The release target also covers safe local changes, commits, synchronization, and conflict recovery.

## 2. Logical architecture

```mermaid
flowchart TD
    Visitor[Visitor] --> Web[React Web Application]
    Web --> Landing[2D Landing]
    Web --> Dashboard[2D Repository Dashboard]
    Web --> World[3D Repository World]
    Web --> Explorer[2D File Tree and Inspector]

    Dashboard --> Backend[Node.js API / Auth Service]
    Explorer --> Backend
    Backend --> GitHub[GitHub REST API]
    Backend --> Workspace[Workspace Service]
    Workspace --> GitEngine[Isolated Git Engine]
    Workspace --> WorkspaceStore[Durable Workspace Storage]

    GitHub --> RepoService[Repository Service]
    RepoService --> TreeParser[Tree Parser and Normalizer]
    TreeParser --> Model[Revision-scoped Repository Model]
    Model --> Layout[3D Layout Engine]
    Model --> Analyzer[Dependency Analyzer]
    Layout --> World
    Analyzer --> World
    Model --> Explorer
```

## 3. Recommended stack

### Frontend
- TypeScript, Vite
- IWSDK (`@iwsdk/core`) with Three.js and ECS systems
- UIKitML panels for spatial UI; DOM overlays where 2D text dominates
- A syntax-highlighting library for source inspection
- Node's built-in test runner for unit tests (see `09-testing-and-acceptance.md`)

### Backend
- Node.js with Fastify or Express
- GitHub OAuth / GitHub App integration, chosen after permission requirements are finalized
- Server-side session storage; use an appropriate persistent store only if deployment requires it
- Input validation and structured logging with secret redaction

### Git workspace execution and storage

The approved model is a **server-managed Git workspace**. The backend creates one isolated workspace per user and repository, and a workspace worker runs a pinned native Git engine against that workspace. The worker is reachable only through typed, authorization-checked backend operations. Workspace metadata, Git objects, the index, and the working tree are durable server-side data; the browser receives status, diffs, and operation results, not a filesystem handle.

This is the first release boundary for clone, branch, diff, stage, commit, fetch, pull, push, and conflict recovery. GitHub remains the remote source of truth, while the workspace is the source of truth for local changes until they are pushed. The renderer and 3D scene remain presentation layers over this state.

Stage, unstage, and discard currently operate on whole files only. Hunk-level changes are not exposed until the Git engine has a reliable patch-splitting implementation. Discard requires explicit confirmation of the exact changed paths and never runs without path-scoped Git arguments.

Browser-local Git/workspace storage was considered because it can reduce server custody and support offline work. It is not selected: browser storage is origin-scoped, browser support for native directory access varies, storage can be evicted, and Quest/WebXR deployments cannot assume access to a user's desktop filesystem. A hybrid browser/server workspace was also rejected for the first release because it duplicates the index and object database and creates difficult conflict, recovery, and synchronization semantics.

The server-managed model requires network access and server capacity, and it does not provide arbitrary local filesystem access or offline commits. Those are explicit limitations, not simulated capabilities. A future native companion could provide local workspaces without changing the web API contract.

### Optional later services
- Durable database for cross-device recents and user preferences
- Job queue for expensive repository analysis
- Object/cache storage for large, revision-scoped analysis results
- Language server or parser service for deeper symbol analysis

Do not add a database, queue, or microservice architecture to the first prototype without a requirement that justifies it.

## 4. Application areas

### Landing area
Public 2D marketing/product page and sign-in entry point.

### Authentication area
Starts authorization, receives the callback on the backend, validates state, exchanges authorization code, and establishes the application session.

### Repository dashboard
Lists accessible repositories, supports search, and imports public repository URLs.

### Repository domain
Owns GitHub API calls, revision selection, tree retrieval, normalization, and content retrieval.

### Git workspace domain

Owns opening/cloning repositories, the Git object database, branch and index state, diffs, commits, remotes, synchronization, and conflict recovery. Its execution and storage location is an architectural decision that must be recorded before implementing writes. Keep credentials outside the WebXR renderer and expose typed, validated operations to the UI.

### Analysis domain
Detects imports and resolves relationships for supported language/configuration combinations.

### 3D scene domain
Owns spatial layout, geometry, labels, camera controls, selection, focus, and edge rendering.

### Inspector domain
Owns file metadata, source loading, syntax highlighting, dependency list, and source navigation.

### History domain
Retrieves commits and changes, builds revision-specific models, and computes structural differences. Basic history and revision comparison are part of the complete desktop-style target; they can follow the initial Git workflow milestone.

## 5. Data flow

1. User requests authentication.
2. Backend starts GitHub authorization and stores anti-CSRF state.
3. GitHub redirects to the backend callback.
4. Backend validates state, exchanges the code, and creates a secure session.
5. Frontend loads repository dashboard data through the backend.
6. User selects a repository and target branch/revision.
7. Repository service resolves the commit SHA, or Workspace Service opens/clones a managed workspace.
8. Workspace Service executes Git operations in the isolated workspace and reports actual branch, HEAD, index, working-tree, and remote state.
9. Repository service fetches the tree for the selected revision or workspace state.
10. Parser normalizes nodes and paths.
11. Analyzer processes supported source files as needed.
12. Layout engine computes spatial positions.
13. Scene and 2D views render the same revision and workspace state.
14. All requests are authorization-checked and stale workspace/revision responses are ignored.

## 6. Suggested API surface

These are application API contracts, not GitHub endpoints. Exact payloads should be formalized in implementation.

- `GET /api/session` — current application session state.
- `GET /auth/github` — begin authorization.
- `GET /auth/github/callback` — server callback.
- `POST /api/auth/logout` — end session.
- `GET /api/repositories?query=...` — list/search repositories visible to the user.
- `POST /api/repositories/import` — validate and import a public repository URL.
- `GET /api/repositories/:owner/:repo/metadata` — repository metadata and revision info.
- `GET /api/repositories/:owner/:repo/tree?ref=...` — normalized tree.
- `GET /api/repositories/:owner/:repo/content?path=...&ref=...` — content for a specific path and revision.
- `GET /api/repositories/:owner/:repo/commits?ref=...` — history endpoint for a later delivery phase.
- `GET /api/repositories/:owner/:repo/analysis?ref=...` — optional cached analysis endpoint if needed.

Workspace operations use a separate `/api/v1/workspaces` contract documented in `19-api-contracts.md`. They never expose Git credentials, filesystem paths, or arbitrary command execution to the browser.

Protected endpoints must derive authorization from the server-side session and verify access to the requested repository. Never trust a client-provided owner/repository pair as proof of authorization.

## 7. Deployment topology

For an initial deployment, use one frontend deployment and one backend service. Serve the frontend over HTTPS. Keep OAuth credentials in server-side environment configuration or a managed secret store. Configure callback URLs explicitly per environment.

Separate frontend and backend origins only if necessary; if they differ, configure CORS and cookie settings carefully. Use secure, HttpOnly, SameSite cookies as appropriate for the deployment topology.

## 8. Failure boundaries

- GitHub API unavailable: keep dashboard usable and show retry.
- Repository tree unavailable: do not create a misleading empty world.
- Parser failure: preserve raw tree navigation if possible.
- Analyzer failure: show files and folders without dependency edges.
- WebGL failure: offer the 2D tree and inspector.
- History unavailable: keep current revision usable.
- Session expired: preserve safe navigation state and ask the user to re-authenticate.
- Workspace worker unavailable: preserve the last confirmed state, mark local operations unavailable, and offer retry or safe workspace close.
- Workspace operation interrupted: report the confirmed Git state only; never infer a commit, push, or discard succeeded from a request timeout.

## 9. Observability

Log request IDs, operation names, status codes, durations, repository identifiers where appropriate, and error categories. Do not log access tokens, OAuth codes, session cookies, private source contents, or sensitive query strings. Add client-side performance measurements for scene load time and frame rate, with privacy-conscious telemetry.
