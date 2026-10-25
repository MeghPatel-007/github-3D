# API Contracts

**Status:** Proposed repository and managed-workspace contract; implementation remains sequenced by the task roadmap
**Project:** GitHub 3D: Code as a World

## 1. Contract principles

- The backend is the boundary between the browser and authenticated GitHub access.
- Every repository response is scoped to a specific immutable commit SHA.
- API responses use JSON and stable, documented error codes.
- Validate request parameters and response payloads at runtime.
- Never return OAuth client secrets, access tokens, or session internals to the browser.
- Do not log source contents or credentials by default.
- These endpoints cover authenticated repository exploration only. They do not implement a local Git index, working tree, commit, or remote synchronization and must not be presented as a substitute for those workflows.
- Git workspace endpoints below use an isolated server-managed Git engine. They expose typed state and operations only; they do not expose credentials, filesystem paths, shells, or arbitrary Git commands.

## 2. Base path and conventions

Base path: `/api/v1`

- JSON request and response bodies use `Content-Type: application/json`.
- IDs and paths are opaque strings; do not infer identity from display names.
- Paths must be normalized and must not escape the selected repository root.
- Use cursor-based pagination where the upstream API supports it.
- Return request IDs to aid troubleshooting.
- For rate limiting, include a retry hint when known.

## 3. Authentication endpoints

### `GET /auth/github`

Starts the GitHub authorization flow. The server creates and validates anti-CSRF `state` and uses PKCE where supported by the chosen OAuth flow.

Expected behavior:
- Redirect to GitHub authorization.
- Request only the permissions required for the feature being used.
- Do not accept a caller-provided arbitrary redirect URL.

### `GET /auth/github/callback`

Validates `state`, exchanges the authorization code server-side, creates a secure session, and redirects to an allowlisted application route.

### `GET /api/v1/session`

Example response:

```json
{
  "authenticated": true,
  "user": {
    "login": "octocat",
    "avatarUrl": "https://example.invalid/avatar.png"
  }
}
```

When unauthenticated, return `authenticated: false` and `user: null`.

### `POST /api/v1/logout`

Invalidates the server session and clears the session cookie.

## 4. Repository endpoints

### `GET /api/v1/repositories?cursor=...`

Lists repositories available to the current user, subject to granted permissions.

Example response:

```json
{
  "items": [
    {
      "id": "github-repo-id",
      "owner": "octocat",
      "name": "hello-world",
      "fullName": "octocat/hello-world",
      "defaultBranch": "main",
      "private": false
    }
  ],
  "nextCursor": null
}
```

### `POST /api/v1/repositories/import`

Request:

```json
{
  "owner": "octocat",
  "repo": "hello-world",
  "ref": "main"
}
```

The server resolves `ref` to a commit SHA, verifies access, and returns a revision-scoped import descriptor.

Example response:

```json
{
  "repository": {
    "owner": "octocat",
    "name": "hello-world",
    "fullName": "octocat/hello-world"
  },
  "revision": {
    "requestedRef": "main",
    "commitSha": "0123456789abcdef0123456789abcdef01234567"
  },
  "treeStatus": "pending"
}
```

### `GET /api/v1/repositories/{owner}/{repo}/tree?sha={commitSha}`

Returns a normalized file tree for the exact commit SHA.

Example response:

```json
{
  "commitSha": "0123456789abcdef0123456789abcdef01234567",
  "truncated": false,
  "nodes": [
    {
      "path": "src",
      "name": "src",
      "kind": "directory",
      "sizeBytes": null
    },
    {
      "path": "src/main.ts",
      "name": "main.ts",
      "kind": "file",
      "sizeBytes": 850
    }
  ]
}
```

### `GET /api/v1/repositories/{owner}/{repo}/contents?path=src/main.ts&sha={commitSha}`

Returns source content only if the caller is authorized and the file passes configured size and binary-content limits.

Example response:

```json
{
  "path": "src/main.ts",
  "commitSha": "0123456789abcdef0123456789abcdef01234567",
  "language": "typescript",
  "encoding": "utf-8",
  "content": "export function main() {}",
  "truncated": false
}
```

The server must never silently return content from a different revision.

### `GET /api/v1/repositories/{owner}/{repo}/dependencies?sha={commitSha}`

Example response:

```json
{
  "commitSha": "0123456789abcdef0123456789abcdef01234567",
  "analyzedFiles": 120,
  "unsupportedFiles": 8,
  "edges": [
    {
      "fromPath": "src/main.ts",
      "toPath": "src/utils.ts",
      "kind": "imports",
      "resolution": "resolved"
    }
  ]
}
```

Dependency edges must identify whether they are resolved, unresolved, external, or unsupported. Do not fabricate edges from filename similarity.

### `GET /api/v1/repositories/{owner}/{repo}/commits?path=src/main.ts&cursor=...`

Optional for a later phase. Returns commit metadata, not patches by default. Keep the response bounded and paginate.

## 6. Managed workspace endpoints

All workspace endpoints require an authenticated session and repository authorization. Workspace IDs are opaque and owner-scoped.

### `POST /api/v1/workspaces`

Creates or resumes a managed workspace for an authorized repository. The request selects a repository and optional branch; it does not provide a remote URL or command.

### `GET /api/v1/workspaces/{workspaceId}`

Returns the confirmed `GitWorkspace` snapshot: current branch, HEAD, upstream, working-tree summary, staged/unstaged counts, sync status, conflict status, and active operation.

### `POST /api/v1/workspaces/{workspaceId}/operations`

Accepts an allowlisted synchronization operation: `fetch`, `pull`, or `push`. Remote writes require explicit server-side GitHub authorization with repository `Contents: read and write`; the browser cannot provide or select a token. Pull is fast-forward-only in this release. The server reports confirmed Git state after completion or marks the outcome unknown after timeout until reconciliation. Divergence and authentication failures are recoverable errors.

### `GET|POST /api/v1/workspaces/{workspaceId}/conflicts`

Returns Git-derived conflicted paths and operation state. `POST` accepts only explicit `abort` or `continue` for supported merge conflicts. Rebase conflicts remain untouched and are reported as unsupported; no endpoint resolves files or overwrites conflict markers.

### `GET /api/v1/workspaces/{workspaceId}/history`

Returns bounded, cursor-paginated commit metadata and Git-reported changed paths. Historical results are immutable and do not replace the active working-tree snapshot.

### `GET /api/v1/workspaces/{workspaceId}/compare`

Compares two explicit revisions using Git name-status output. Rename evidence is disabled unless Git reports it; unavailable revisions return an error without changing workspace state.

### `DELETE /api/v1/workspaces/{workspaceId}`

Closes or deletes a workspace only after explicit confirmation and a clean/retained-work warning. Deletion must never be implied by repository switching.

Workspace responses must never include access tokens, credential helpers, host paths, command lines, hook output containing secrets, or unbounded repository content. Long operations may return a job identifier and progress events, but cancellation must not claim rollback unless Git confirms it.

## 7. Error format

```json
{
  "error": {
    "code": "REPOSITORY_NOT_FOUND",
    "message": "The repository could not be accessed.",
    "requestId": "req_123"
  }
}
```

Recommended codes:

| HTTP | Code | Meaning |
|---|---|---|
| 400 | `INVALID_REQUEST` | Invalid query or body |
| 401 | `UNAUTHENTICATED` | Login required |
| 403 | `FORBIDDEN` | Authenticated but not authorized |
| 404 | `REPOSITORY_NOT_FOUND` | Missing or intentionally indistinguishable inaccessible repository |
| 409 | `REVISION_MISMATCH` | Data belongs to a different commit |
| 413 | `CONTENT_TOO_LARGE` | File or payload exceeds limit |
| 429 | `RATE_LIMITED` | Request throttled |
| 502 | `UPSTREAM_GITHUB_ERROR` | Upstream API failed |
| 503 | `ANALYSIS_UNAVAILABLE` | Analysis service temporarily unavailable |

## 8. Security and reliability requirements

- Enforce authorization on every repository and content endpoint.
- Validate owner, repository, path, ref, and SHA inputs.
- Defend against path traversal and unsafe redirect URLs.
- Apply request timeouts, concurrency limits, response-size limits, and rate-limit handling.
- Cache only data with a clear authorization and revision scope.
- Never rely on client-supplied repository IDs as proof of access.
- Use `Cache-Control: no-store` for sensitive user/session responses.
- Redact credentials, cookies, authorization headers, and source text from logs.
- Authorize workspace ownership and repository access on every request.
- Serialize conflicting operations per workspace and reconcile after timeout or worker restart.
- Apply worker CPU, memory, disk, duration, and concurrency limits.
- Do not execute repository hooks, scripts, or arbitrary commands.

## 9. Acceptance criteria

- Contracts are implemented and covered by schema tests.
- Unauthenticated requests to protected endpoints fail consistently.
- Private repository access is checked server-side.
- All tree/content/dependency results identify the same commit SHA.
- Error codes and loading states are mapped to clear UI behavior.
- Workspace state is confirmed by Git after each operation; unknown outcomes remain explicit.
- Workspace APIs never expose credentials or arbitrary command execution.
