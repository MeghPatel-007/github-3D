# 03 — Authentication and Security

## 1. Purpose

GitHub authentication is the entry point to the product, but it does not automatically grant broad access. Permissions must be explicit, minimal, and aligned with the features enabled.

## 2. Authentication flow

1. User selects **Continue with GitHub**.
2. Frontend asks backend to begin authorization.
3. Backend generates a cryptographically secure state value and stores it server-side.
4. Backend redirects the browser to GitHub's authorization page.
5. User reviews and approves or denies the requested access.
6. GitHub redirects to the configured backend callback.
7. Backend validates state and validates the callback response.
8. Backend exchanges the authorization code using server-held credentials.
9. Backend obtains the minimum credential/session material required by the chosen integration.
10. Backend creates a secure application session.
11. Frontend loads the dashboard using the session.
12. User can revoke access through GitHub and log out of the application.

Use PKCE where supported by the selected authorization flow. Follow current GitHub documentation when choosing between an OAuth App and a GitHub App. Do not assume the two models have identical permissions or token behavior.

## 3. Token and session rules

- OAuth client secrets must exist only on the server.
- Privileged access tokens must never be embedded in frontend JavaScript.
- Do not put tokens in query parameters, local storage, or logs.
- Prefer secure, HttpOnly cookies for the application session.
- Apply appropriate SameSite and Secure attributes.
- Protect state-changing requests against CSRF according to the session architecture.
- Use short, justified session lifetimes and implement expiry handling.
- Rotate or invalidate session material on logout and relevant authorization changes.
- Never return raw access tokens to the client unless the selected architecture explicitly requires and safely supports that pattern; the default design must not do so.

## 4. Permission strategy

Use least privilege for the feature currently being used. Read access is sufficient for the initial repository-exploration milestone. The complete desktop-style target also includes local Git changes and remote writes, so adding commit/push or other write workflows requires an explicit permission review, a clear user authorization step, and server-side enforcement before those features ship. Do not request write permissions early just because they are on the roadmap.

The UI must clearly distinguish:
- Public repository imported by URL.
- Repository available through current authorization.
- Repository inaccessible because of permissions or organization policy.
- Authorization revoked or expired.

Do not ask for write access until a shipped feature actually needs it. Read-only exploration is an early milestone; it is not the product's final scope. For every write-capable feature, document the exact GitHub App permission or OAuth scope, limit it to the required repositories and actions, and test denial/revocation behavior.

## 5. Repository URL validation

- Accept only supported GitHub repository URL formats.
- Parse owner and repository as structured path segments.
- Reject unexpected schemes, malformed hosts, embedded credentials, and ambiguous paths.
- Do not fetch arbitrary user-supplied URLs from the backend.
- Construct GitHub API URLs from validated owner/repository/path components.
- Prevent server-side request forgery by restricting outbound requests to expected GitHub API hosts.
- Encode path segments correctly and reject path traversal attempts.

## 6. Authorization checks

For every protected request:
- Validate the application session.
- Confirm the requested repository is accessible through the current user/app authorization.
- Scope content, tree, and history requests to the requested repository and revision.
- Do not trust client-provided repository metadata as authorization evidence.
- Avoid cross-user cache leakage by including authorization scope in cache keys when data visibility differs by user.

## 7. Data handling

Default to transient processing of repository metadata and source. Persist user preferences or recent repositories only when needed and documented. Do not persist private source code by default. If caching is introduced, document retention, invalidation, access control, and deletion behavior.

## 8. Managed workspace boundary

Git execution uses the server-managed workspace model from decision D-013. A workspace is owned by an application user and bound to one authorized repository and remote. The browser receives a workspace identifier and typed Git state; it never receives a GitHub token, remote credential, host filesystem path, shell, or arbitrary Git command channel.

- Authorize every workspace read and mutation against the current application session, repository access, and workspace owner.
- Run each workspace in an isolated worker with resource, time, disk, and concurrency limits; do not execute repository hooks or project scripts as part of Git operations.
- Keep GitHub credentials in the server-side credential boundary. Use them only for the requested remote operation and redact them from process arguments, logs, errors, and job metadata.
- Encrypt workspace storage in transit and at rest where provided by deployment infrastructure. Define retention and deletion before private-repository workspaces ship.
- Treat operation timeouts as unknown outcomes. Reconcile Git state before retrying any mutating operation.
- A workspace may contain private source and uncommitted changes, so it is protected data even when the remote repository is public.

## 9. Threat model

| Threat | Mitigation |
|---|---|
| OAuth CSRF | Validate state; use PKCE where supported |
| Token leakage | Server-side token handling, secret redaction, HTTPS |
| SSRF through repository URL | Strict host allowlist and structured URL parsing |
| Unauthorized private-repository access | Server-side authorization on every request |
| Cross-user cache leakage | Authorization-aware cache keys |
| XSS from repository content | Treat source, names, and metadata as untrusted text; avoid unsafe HTML rendering |
| Resource exhaustion | Size limits, timeouts, concurrency limits, bounded scene objects |
| API abuse | Rate-limit application endpoints and respect GitHub limits |
| Session theft | Secure cookies, HTTPS, expiry and invalidation |
| Malicious repository content | Never execute repository code; safely render source as text |
| Workspace escape or command injection | Typed operation allowlist, isolated worker, no shell input, resource limits |
| Cross-user workspace access | Owner/repository authorization on every request and storage lookup |
| Loss of uncommitted work | Durable workspace storage, confirmed operation state, explicit close/delete flows |

## 10. Security acceptance criteria

- No OAuth secret or privileged token appears in a production client bundle.
- Callback state validation is tested.
- Invalid and non-GitHub URLs are rejected.
- Protected content cannot be fetched without a valid session and repository authorization.
- Source code is rendered as text, not executed as HTML or JavaScript.
- Logs and error messages do not reveal credentials.
- Logout invalidates the application session.
- Workspace operations cannot address another user's workspace or execute arbitrary commands.
- Workspace credentials and filesystem paths never cross the browser boundary.
