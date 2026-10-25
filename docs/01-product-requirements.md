# 01 — Product Requirements

## 1. Product summary

**Name:** GitHub 3D  
**Tagline:** Code as a World  
**Category:** Developer tools / 3D Git client  
**Primary platform:** Desktop-first web application, with responsive 2D fallback.

GitHub 3D is a fully working, GitHub Desktop-style client whose primary workspace is an interactive 3D representation of a repository. Users sign in, open or clone repositories, manage branches and local changes, review diffs, stage and commit work, synchronize with GitHub, recover from conflicts, and inspect history. These actions must be usable from synchronized 2D controls as well as the 3D workspace.

GitHub is the remote source of truth. The selected Git workspace is authoritative for local branches and uncommitted changes until synchronized. GitHub 3D must use a real Git engine for Git operations; the 3D scene visualizes state and never substitutes for it. The exact engine and workspace-storage architecture must be decided before write operations are implemented.

## 2. Problem statement

Traditional repository interfaces rely on file trees, tabs, text search, and separate graphs. These are useful, but they can make it harder for some users to form a mental model of a large codebase and its relationships.

The product should make repository structure explorable while preserving precise developer-tool interactions such as source inspection, path search, and relationship tracing.

## 3. Goals

- Provide a polished, conventional 2D entry point.
- Let users authenticate through GitHub using permissions matched to enabled features.
- Let users discover, open, or clone repositories and see the active local/remote state.
- Support core desktop Git workflows: branch management, change review, staging, commits, fetch, pull, push, conflict recovery, and history.
- Make a navigable 3D repository workspace the primary experience, with complete practical 2D controls.
- Show files and folders accurately.
- Allow users to inspect source, navigate by path, and review precise file/hunk diffs.
- Visualize detected, explainable dependencies.
- Preserve local work, report operation results truthfully, and provide recovery paths.
- Establish a modular foundation for progressively broader GitHub Desktop-style workflows.

## 4. Boundaries and phased delivery

- Replacing GitHub hosting, its web product, or its server-side collaboration services.
- Executing repository code.
- Runtime call-graph reconstruction.
- Full semantic analysis for every programming language.
- Real-time multi-user collaboration.
- AI-generated explanations.
- Production-scale support for every possible repository size.
- Any operation that violates GitHub authorization or the user's local permissions.

The full product target includes a practical desktop-client workflow, not exact cloning of GitHub Desktop's proprietary implementation or every visual detail. Requirements are delivered in tested increments. Read-only repository exploration is an early milestone, not the final product.

## 5. Target users

### Developer exploring an unfamiliar repository
Needs to understand folders, files, and import relationships quickly.

### Student or open-source contributor
Needs an approachable visual overview and easy navigation to source.

### Engineering team member
Needs to trace a limited set of relationships and later compare structural changes across revisions.

## 6. Primary user journey

1. Visitor opens the 2D landing page.
2. Visitor selects **Continue with GitHub**.
3. GitHub authorization is completed.
4. Application validates the callback and establishes a secure session.
5. User lands on the 2D repository dashboard.
6. User selects an accessible repository or enters a public repository URL.
7. Application loads repository metadata and resolves a commit SHA.
8. Application fetches the tree and builds a normalized repository model.
9. Application displays progress and then offers **Enter 3D World**.
10. A short, skippable transition opens the 3D scene at the repository hub.
11. User navigates folders, selects files, searches paths, and inspects source.
12. User enables dependency edges and explores connected files.
13. User returns to the dashboard without losing the active repository context.

Failure paths must be handled at every step, including authorization denial, inaccessible repositories, rate limits, truncated tree results, network errors, unsupported content, and WebGL failure.

## 7. Functional requirements

### Landing and authentication entry

- **FR-WEB-01:** Display a 2D landing page explaining the product and its primary use.
- **FR-WEB-02:** Provide a clear GitHub sign-in action.
- **FR-WEB-03:** Explain that repository access is subject to the permissions granted by the user.
- **FR-WEB-04:** Provide loading, failure, and retry states for authentication initiation.

### Authentication and session

- **FR-AUTH-01:** Complete a secure GitHub OAuth or GitHub App authorization flow.
- **FR-AUTH-02:** Validate OAuth state and use PKCE where supported by the selected flow.
- **FR-AUTH-03:** Keep client secrets and private access tokens out of browser bundles.
- **FR-AUTH-04:** Establish and expire sessions securely.
- **FR-AUTH-05:** Support logout and expired-session recovery.
- **FR-AUTH-06:** Request only permissions necessary for the features enabled.
- **FR-AUTH-07:** Show clear authorization-denied and insufficient-permission states.

### Repository dashboard

- **FR-REPO-01:** Show repositories available to the authenticated user, subject to granted permissions.
- **FR-REPO-02:** Support searching and selecting repositories.
- **FR-REPO-03:** Support importing a public repository by URL.
- **FR-REPO-04:** Display owner, repository name, default branch, and available language/metadata.
- **FR-REPO-05:** Display import and parsing progress.
- **FR-REPO-06:** Allow retry after recoverable failures.
- **FR-REPO-07:** Let users reopen recent repositories if persistence is implemented.
- **FR-REPO-08:** Never imply that login grants access to repositories for which the user has not authorized access.

### Repository loading and model

- **FR-MODEL-01:** Resolve a repository revision to a specific commit SHA before building its model.
- **FR-MODEL-02:** Fetch and normalize the repository tree.
- **FR-MODEL-03:** Represent repository, directory, and file nodes with stable identifiers within a revision.
- **FR-MODEL-04:** Preserve parent-child relationships and normalized paths.
- **FR-MODEL-05:** Detect truncated tree responses and fetch missing subtrees when practical.
- **FR-MODEL-06:** Exclude or collapse configured generated/dependency directories.
- **FR-MODEL-07:** Keep model metadata separate from render coordinates.
- **FR-MODEL-08:** Do not mix content from different revisions.

### 3D world

- **FR-3D-01:** Represent the repository root as a central hub or landmark.
- **FR-3D-02:** Represent directories as spatial groups, rooms, or zones.
- **FR-3D-03:** Represent files as selectable objects.
- **FR-3D-04:** Support orbit, zoom, pan, selection, camera focus, and reset.
- **FR-3D-05:** Provide hover and selected states.
- **FR-3D-06:** Keep labels readable at appropriate zoom levels.
- **FR-3D-07:** Support collapsing or hiding large subtrees.
- **FR-3D-08:** Provide a short, skippable transition from dashboard to world.
- **FR-3D-09:** Provide a way back to the dashboard.
- **FR-3D-10:** Show a 2D fallback when WebGL is unavailable or the scene fails.

### File inspector and search

- **FR-INSPECT-01:** Selecting a file opens a side inspector.
- **FR-INSPECT-02:** Show path, name, type, size when available, and original GitHub link.
- **FR-INSPECT-03:** Fetch text content on demand instead of eagerly loading all files.
- **FR-INSPECT-04:** Syntax-highlight supported source files.
- **FR-INSPECT-05:** Treat binary and oversized files safely.
- **FR-SEARCH-01:** Search file names and repository paths.
- **FR-SEARCH-02:** Selecting a result focuses the correct scene object.
- **FR-SEARCH-03:** Provide extension, category, and directory filters.
- **FR-SEARCH-04:** Provide clear no-results and clear-filter states.

### Dependency visualization

- **FR-DEP-01:** Detect imports for explicitly supported languages.
- **FR-DEP-02:** Resolve local imports where resolution rules are known.
- **FR-DEP-03:** Represent resolved imports as directed edges.
- **FR-DEP-04:** Distinguish dependency edges from directory containment.
- **FR-DEP-05:** Highlight incoming and outgoing edges for a selected file.
- **FR-DEP-06:** Mark unresolved imports instead of guessing targets.
- **FR-DEP-07:** Provide filters and a legend for relationship types.
- **FR-DEP-08:** Record analysis limitations and supported language/configuration.

### Core Git client workflows

- **FR-GIT-01:** Open an existing workspace or clone an authorized remote repository and show operation progress and recoverable errors.
- **FR-GIT-02:** Show the active repository, current branch, upstream, HEAD commit, and sync state from the Git engine.
- **FR-GIT-03:** List, create, switch, rename, and safely delete local branches; prevent unsafe checkout that would overwrite uncommitted work.
- **FR-GIT-04:** Show untracked, added, modified, renamed, and deleted files, separating staged from unstaged changes.
- **FR-GIT-05:** Show accurate file and hunk diffs; identify binary, oversized, and unsupported changes.
- **FR-GIT-06:** Stage and unstage files or supported hunks. Confirm destructive discard actions and preserve work where recovery is possible.
- **FR-GIT-07:** Create commits from staged changes only, validate the message, and show the resulting commit identity.
- **FR-GIT-08:** Fetch, pull, and push with visible progress, authentication recovery, and verified completion states.
- **FR-GIT-09:** Detect divergent history and merge conflicts; provide supported continue/abort recovery without silently overwriting user work.
- **FR-GIT-10:** Browse commit history and compare revisions using evidence from the Git engine and GitHub API.
- **FR-GIT-11:** Open the repository, branch, and commit in GitHub and support creating/opening a pull request for a published branch where authorized; keep hosted collaboration distinct from local Git operations.
- **FR-GIT-12:** Keep the 3D scene, file tree, status panel, diff, and operation controls synchronized with the same workspace state.
- **FR-GIT-13:** Keep all essential Git workflows keyboard-operable and available through the 2D interface when WebGL is unavailable.

### Later feature requirements

- **FR-SYM-01:** Index supported function and class declarations.
- **FR-SYM-02:** Resolve symbol references with language-aware analysis when available.
- **FR-SYM-03:** Display file path and line number for definitions and references.
- **FR-HIST-01:** Display commit metadata and changed-file summaries.
- **FR-HIST-02:** Let users select a historical revision.
- **FR-HIST-03:** Compare supported revisions and identify added, changed, and removed files.
- **FR-HIST-04:** Animate scene changes without claiming to reconstruct runtime behavior.

## 8. Non-functional requirements

- **NFR-PERF-01:** Establish a benchmark on a representative laptop; initial target is 30+ FPS for a scene with approximately 500 visible objects.
- **NFR-PERF-02:** Fetch file contents on demand and cache revision-scoped results.
- **NFR-PERF-03:** Avoid unbounded geometry, label, and edge creation.
- **NFR-SEC-01:** No secrets or privileged tokens in frontend bundles, logs, or URLs.
- **NFR-SEC-02:** Validate inputs and authorize every protected repository request.
- **NFR-REL-01:** Provide recoverable error states and retries.
- **NFR-DATA-01:** All displayed repository relationships must be grounded in fetched data or explicitly marked as inferred.
- **NFR-A11Y-01:** Core actions must be keyboard-operable where practical.
- **NFR-A11Y-02:** Provide a 2D file-tree alternative to spatial navigation.
- **NFR-MAINT-01:** Separate API, parsing, analysis, layout, rendering, and UI modules.
- **NFR-TEST-01:** Unit-test parsing, resolution, and layout independently of WebGL.
- **NFR-PRIV-01:** Collect and persist only data required for the product's enabled features.

## 9. First usable milestone and final product gate

The first usable milestone is complete when a user can authenticate, open/import an authorized repository, load a consistent revision, enter the 3D world, navigate files, inspect source, search paths, and see real dependency edges for the supported language subset. Error states and a 2D fallback must work. This milestone does not constitute the finished product.

The final product gate requires all supported FR-GIT workflows (open/clone, branch management, working-tree status, diff, stage/unstage, commit, fetch/pull/push, conflict recovery, and history) to work against real Git state, with clear authorization, recovery, security, and accessible 2D paths. The 3D workspace must represent that same state and remain useful as the main experience. Each release must publish a tested capability matrix; unsupported behavior must be clearly identified. Symbol tracing, broad language coverage, and advanced hosted collaboration can follow the core Git-client gate.
