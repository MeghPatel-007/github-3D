# Threat Model and Privacy

**Status:** MVP security and privacy requirements  
**Project:** GitHub 3D: Code as a World

## 1. Assets to protect

- GitHub credentials and application secrets.
- User sessions.
- Private repository metadata and source code.
- Repository authorization decisions.
- Source-analysis results that could reveal architecture.
- Logs, caches, crash reports, and generated exports.

## 2. Trust boundaries

1. Browser to application API.
2. Application API to GitHub.
3. Authentication callback to session creation.
4. Repository content to parsers and renderers.
5. Application runtime to logs, telemetry, and optional cache.
6. User-supplied repository URL/ref/path to backend request handling.

Treat repository files and metadata as untrusted input even when obtained from GitHub.

## 3. Threats and mitigations

| Threat | Mitigation |
|---|---|
| OAuth state forgery or callback CSRF | Generate, bind, validate, and expire state; use a vetted auth library |
| Credential leakage to browser | Keep confidential secrets and privileged tokens server-side |
| Session theft | HTTPS, secure HttpOnly cookies, expiry, rotation, logout invalidation |
| Cross-site request forgery | Appropriate SameSite cookie policy and CSRF defenses for state-changing routes |
| Unauthorized private repository access | Server-side authorization on every request; minimum required permissions |
| Path traversal | Normalize paths, reject traversal, and scope reads to the selected repository and revision |
| Open redirect | Allowlist post-login redirect targets |
| Malicious source content | Render as escaped text; never execute repository code in the app origin |
| Parser denial of service | Bound file size, analysis time, recursion, concurrency, and total file count |
| Resource exhaustion in 3D | Cap visible nodes/edges and degrade gracefully |
| Cache leakage across users | Scope cache keys and access checks to authorization and immutable revision |
| Log/telemetry disclosure | Redact tokens, cookies, source content, and sensitive URL parameters |
| Dependency compromise | Lockfile, dependency review, automated advisory scanning |
| API abuse or scraping | Rate limits, timeouts, quotas, and monitoring |

## 4. Repository content handling

- Treat source files as data, not executable plugins.
- Never run repository scripts or install its dependencies on the application server as part of visualization.
- Do not use `eval`, dynamic script injection, or unsafe HTML rendering for source previews.
- Apply file size, total bytes, file count, and analysis-time limits.
- Detect likely binary files and skip or mark them unsupported.
- Make partial analysis visible to users.
- Avoid sending private source content to third-party AI or telemetry services unless a separate explicit feature, consent, and privacy review authorizes it.

## 5. Data minimization and retention

For MVP:
- Store only the minimum user/session information needed.
- Prefer short-lived server sessions and avoid persisting repository content unless required.
- If caching is added, document retention, invalidation, authorization scope, and deletion behavior.
- Provide a clear logout action and document what logout invalidates.
- Define retention periods before production launch; do not leave private source caches indefinitely.
- Do not claim data is never stored unless the implementation proves it.

## 6. Permission design

Request the smallest GitHub permission set that supports the chosen product features. Explain why repository access is needed. Private repository access must be explicit, revocable, and enforced server-side.

If using a GitHub App, distinguish installation permissions from user authorization and check both where required. If using OAuth, verify current GitHub guidance for scopes, callback security, and token handling before implementation.

## 7. Incident response

If a secret or private source leak is suspected:
1. Disable or revoke affected credentials.
2. Restrict access to affected logs, caches, and artifacts.
3. Determine the scope and time window.
4. Remove exposed data where possible.
5. Notify affected parties as required by applicable policy or law.
6. Document the cause and corrective actions.

## 8. Acceptance criteria

- Security-sensitive flows have automated tests.
- No token or session secret is present in frontend bundles or logs.
- Source preview is non-executable.
- Access checks cover all repository endpoints.
- Limits exist for source analysis and rendering.
- Data retention and telemetry behavior are documented before production.
