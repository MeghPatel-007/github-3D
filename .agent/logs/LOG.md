# Project Build Log

`Current Status`
=================
**Last Updated:** 2026-10-25
**Tasks Completed:** 4
**Current Task:** TASK-4 Complete

----------------------------------------------

## Session Log

<!-- TODO: Add log entries here -->

## TASK-1 — Test invalid repository import responses

- Added isolated client validation tests for invalid commit SHA, traversal path, and more than 10,000 entries.
- Focused test: `bun test tests/repository-api.test.ts` passed (4 tests).
- `bun run test` blocked by existing Node `.ts` loading failures and an unrelated `ralph-capture` failure.
- `bun run typecheck` blocked by missing existing Playwright, Vitest, and Node type dependencies.
- `bun run build` blocked by missing Rollup native optional dependency.

## TASK-2 — Choose the Git workspace architecture

- Compared browser-local, server-managed, and hybrid Git workspace models against IWSDK/WebXR portability, durability, security, and deployment.
- Recorded D-013: isolated server-managed Git workers with durable per-user/repository workspaces and typed allowlisted API operations.
- Aligned system architecture, authentication/security, repository data, and API contracts without adding Git write code or permissions.
- Verified documentation JSON and whitespace; full Bun checks reported below.

## TASK-3 — Complete secure GitHub sign-in and session lifecycle

- Verified the approved GitHub App user-authorization flow: server-held client secret and tokens, PKCE, state validation, secure HttpOnly session cookies, read-only `offline_access`, refresh, logout, and authorization-expiry handling.
- Added focused coverage for secure cookie attributes, authorization denial, transaction replay rejection, and failed token refresh invalidation.
- Corrected the architecture document's stale auth route to match the configured `GET /auth/github` endpoint.
- Focused test: `bun test tests/auth.test.mjs` passed (6 tests).
- `bun run test` blocked by the existing `ralph-capture` failure and Node `.ts` loading failures (14 passed, 3 failed).
- `bun run typecheck` blocked by existing missing Playwright, Vitest, and Node type dependencies.
- `bun run build` blocked by the existing missing Rollup native optional dependency.

## TASK-4 — Add authenticated repository discovery and selection

- Added authorized repository search with bounded query length and cursor pagination.
- Added retry, empty, loading, inaccessible, and rate-limit handling for repository discovery.
- Kept repository selection server-authorized and revision-pinned; surfaced owner, branch, and commit in the 2D and 3D views.
- Added auth coverage for filtered authorized results and invalid search bounds.
- Focused checks: `bun test tests/auth.test.mjs tests/github-api.test.mjs` passed (13 tests); targeted TypeScript checks passed.
- Full `bun run typecheck`, `bun run build`, and `bun run test` remain blocked by missing workspace dependencies and pre-existing test-runner failures.

## TASK-5 — Create, open, and clone real Git workspaces

- Added server-managed workspace lifecycle APIs backed by native Git: initialize, resume/open, and atomic clone.
- Added opaque per-user/repository workspace identity, confirmed branch/HEAD/remote/working-tree snapshots, cancellation cleanup, and overwrite protection.
- Added a server-only askpass boundary for authorized clone credentials; tokens never enter workspace metadata, remote URLs, or renderer responses.
- Added workspace API client and authenticated 2D controls for open, clone, and initialize actions.
- Focused checks: `bun test tests/workspace.test.mjs tests/auth.test.mjs tests/github-api.test.mjs tests/repository-api.test.ts` passed (21 tests); native module syntax and `git diff --check` passed.
- `bun run typecheck` and `bun run build` blocked because `tsc` and `vite` are unavailable in the installed workspace dependencies.

## TASK-8 — Implement safe staging and discard actions

- Added typed server-managed file-level stage, unstage, and discard operations using native Git `add`, `reset`, `restore`, and `clean` with explicit path scoping.
- Added exact-path discard confirmation, stale-change rejection, and UI refresh after every operation; hunk operations remain unavailable and are documented as an engine limitation.
- Fixed porcelain status parsing so leading index-state whitespace is preserved for unstaged changes.
- Focused checks: `bun test tests/workspace.test.mjs tests/auth.test.mjs tests/github-api.test.mjs tests/repository-api.test.ts` passed (26 tests); `node --check server/workspace.mjs server/index.mjs` and `git diff --check` passed.
- Full `bun run test` remains blocked by the existing `ralph-capture` failure and Node `.ts` loading failures (24 passed, 3 failed); `bun run typecheck` and `bun run build` remain blocked because `tsc` and `vite` are unavailable.

## TASK-7 — Show working-tree changes and accurate diffs

- Added server-managed Git status and diff endpoints using porcelain status and Git-generated patches.
- Distinguished untracked, added, modified, renamed, and deleted paths; separated staged and unstaged diffs.
- Bounded diff output and identified binary or unsupported content without rendering binary bytes as source.
- Added synchronized 2D change review controls that select the existing tree and 3D repository selection event.
- Focused checks: `bun test tests/workspace.test.mjs` passed (8 tests); server syntax and `git diff --check` passed.
- Full `bun run test` remains blocked by the existing `ralph-capture` failure and Node `.ts` loading failures (22 passed, 3 failed); `bun run typecheck` and `bun run build` remain blocked because `tsc` and `vite` are unavailable.

## TASK-6 — Add safe branch management

- Added real local and remote branch listing with current-branch and upstream metadata.
- Added server-managed create, checkout, rename, and non-forced delete operations with branch-name validation and workspace authorization.
- Native Git checkout and deletion safety remains enforced; dirty checkout, checked-out deletion, and unmerged deletion return explicit conflicts.
- Added synchronized 2D branch controls and branch state updates to the 3D panel title.
- Focused checks: `bun test tests/workspace.test.mjs tests/auth.test.mjs tests/github-api.test.mjs tests/repository-api.test.ts` passed (22 tests); `node --check server/workspace.mjs server/index.mjs` and `git diff --check` passed.
- `bun run typecheck` and `bun run build` blocked because `tsc` and `vite` are unavailable in the installed workspace dependencies.
