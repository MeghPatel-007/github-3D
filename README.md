# GitHub 3D — Code as a World

GitHub 3D targets a GitHub Desktop-style client with a 3D repository world and synchronized 2D controls. The current implementation includes GitHub App authentication and repository access, server-managed workspaces, branch operations, file-level change review and staging, commits, remote synchronization, merge-conflict recovery, commit history/comparison, and pull-request context. These features have focused automated coverage, but the full release gate is still open; see the [release evidence matrix](docs/09-testing-and-acceptance.md#6-current-release-evidence) and [capability roadmap](docs/25-implementation-task-breakdown.md).

## Run

Requires Bun 1.4.2 and the Node.js version from `.nvmrc`. Install dependencies with `bun install`.

Start the API and app in separate terminals:

```sh
bun run api
bun run dev
```

Run checks with `bun run typecheck`, `bun run test`, and `bun run build`.

### Windows-local Ralph

Install Bun and the OpenCode CLI on Windows, then run this from PowerShell in
the repository:

```powershell
.\ralph.ps1 -MaxIterations 8 -Model openai/gpt-5.6-luna
```

Use `-Once` for a single iteration. This launcher runs OpenCode directly on the
Windows checkout and does not create a Docker sandbox. OpenCode therefore has
the permissions of your Windows account.

Use the managed browser's Runtime and Editor controls to switch between the app
and authored scene.

## Current implementation and limits

The `tiny-ts` fixture demonstrates revision-bound file metadata, spatial file and
directory nodes, searchable tree selection, a bounded source preview, and literal
JS/TS imports. Unresolved imports remain explicit. Source is rendered as text.

The local API (`bun run api`) imports public repository trees and fetches bounded
file content at the resolved commit SHA. The 3D view caps visible nodes at 500;
tree search displays up to 200 matches at a time. When a managed workspace is
open, the 3D panel summarizes its branch, HEAD, and working-tree counts; branch,
diff, stage, commit, sync, and conflict controls currently live in the 2D UI.
Per-file Git status is not yet mapped onto 3D objects, and live workspace state
is not yet a complete replacement for the imported GitHub tree. File-level
staging is supported; hunk staging and rebase conflict recovery are not. Pull is
fast-forward-only. GitHub App sign-in and private repository listing require the
app to be configured and installed on target accounts. The 500-node limit is a
cap, not a performance guarantee. Do not treat fixture data as live GitHub data
or claim desktop-client parity. See [`docs/`](docs/README.md) for requirements
and evidence.

## Optional GitHub App sign-in

Register a GitHub App with **Contents: read-only** and **Metadata: read-only**
for browsing and cloning. Add **Contents: write** if remote push is enabled, and
**Pull requests: write** if pull-request creation is enabled. Keep each permission
limited to the repositories where the user installs the app. Enable user authorization
and expiring user access tokens. The sign-in flow uses PKCE. Set its callback URL to
`https://localhost:8081/auth/github/callback` for local development. Install the
app on accounts and repositories users should be able to browse.

Copy `.env.example` to `.env` only if you do not already have a local `.env`.
Set `GITHUB_APP_CLIENT_ID`, `GITHUB_APP_CLIENT_SECRET`, `GITHUB_APP_SLUG`,
`GITHUB_APP_CALLBACK_URL`, and `WEB_ORIGIN`. Keep `.env` private. The API keeps
tokens and sessions in process memory; API restarts sign users out. Use one API
instance until a shared session store is added.
