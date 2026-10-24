# Environment and Deployment

**Status:** Proposed operational baseline  
**Project:** GitHub 3D: Code as a World

## 1. Environments

Maintain at least:
- Local development
- Preview/staging
- Production

Use separate OAuth app registrations and credentials where practical. Never reuse production secrets in preview deployments.

## 2. Environment variables

Example names only; the actual provider and session design may change.

```dotenv
NODE_ENV=development
WEB_ORIGIN=http://localhost:5173
API_ORIGIN=http://localhost:3000
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
SESSION_SECRET=
SESSION_COOKIE_NAME=gh3d_session
LOG_LEVEL=info
```

Rules:
- Keep secrets in an ignored local environment file or secret manager.
- Commit an `.env.example` containing blank or harmless placeholder values only.
- Validate required variables at server startup.
- Do not prefix server secrets with frontend-exposed variable conventions such as `VITE_`.
- Do not print secret values in startup logs or exception messages.
- Rotate credentials if they are exposed.

## 3. Local development

Suggested commands; adjust to the actual package manager and scripts.

```bash
bun install
bun run dev
bun run typecheck
bun run lint
bun test
bun run build
```

Provide a README with:
1. Required Node.js version.
2. Package manager and install command.
3. GitHub OAuth app setup instructions.
4. Environment variable setup.
5. Local callback URL configuration.
6. Test, lint, type-check, and build commands.
7. Demo mode instructions.

A demo mode should use bundled, non-sensitive fixture data and must not pretend to be connected to GitHub.

## 4. Build and CI pipeline

On every pull request:
1. Install from the lockfile.
2. Run formatting/lint checks.
3. Run TypeScript type checking.
4. Run unit and component tests.
5. Build client and server.
6. Run API contract/schema tests.
7. Run end-to-end smoke tests where CI supports browser execution.
8. Check for known dependency vulnerabilities using the team's selected tool.

Fail the pipeline on errors in required checks. Keep optional long-running performance checks separate if necessary.

## 5. Deployment architecture

A typical deployment has:
- Static frontend hosting for the React application.
- A server runtime for authentication and GitHub API mediation.
- HTTPS on all public routes.
- A managed secret store or platform secret configuration.
- Optional cache/storage only if its authorization and retention model is documented.

Do not deploy an OAuth secret in static frontend assets. If frontend and API use separate origins, configure a strict CORS allowlist and secure cookie behavior.

## 6. Security headers and cookies

- HTTPS only in production.
- `HttpOnly`, `Secure`, and an appropriate `SameSite` setting for session cookies.
- Restrictive CORS policy.
- Content Security Policy compatible with the app's rendering needs.
- Frame restrictions, MIME sniffing protection, and a sensible referrer policy.
- Session rotation/expiration and server-side invalidation on logout.

## 7. Rollback and release

- Keep deploys reproducible.
- Record release version or commit.
- Use health checks for the API.
- Define a rollback path to the last known-good release.
- Avoid database migrations until persistent data is introduced; if added later, document backward compatibility and rollback strategy.

## 8. Acceptance criteria

- A clean checkout can run using documented instructions.
- CI verifies types, tests, and builds.
- Production secrets are managed outside source control and browser bundles.
- HTTPS, secure cookies, and restricted CORS are configured.
- A rollback procedure is documented and tested before production use.
