# GitHub 3D — Code as a World

GitHub 3D is intended to become a fully working, GitHub Desktop-style client with a 3D repository world as its primary workspace and synchronized 2D controls. The current IWSDK app is an early read-only repository explorer; branch management, diffs/staging, commits, remote sync, conflict recovery, and full history workflows remain roadmap work. See [`docs/25-implementation-task-breakdown.md`](docs/25-implementation-task-breakdown.md) for the complete target and delivery gates.

## Run

Requires Bun 1.4.2 and the Node.js version from `.nvmrc`. Install dependencies with `bun install`.

Start the API and app in separate terminals:

```sh
bun run api
bun run dev
```

Run checks with `bun run typecheck`, `bun run test`, and `bun run build`.

Use the managed browser's Runtime and Editor controls to switch between the app
and authored scene.

## Current demo

The `tiny-ts` fixture demonstrates revision-bound file metadata, spatial file and
directory nodes, searchable tree selection, a bounded source preview, and literal
JS/TS imports. Unresolved imports remain explicit. Source is rendered as text.

The local API (`bun run api`) imports public repository trees and fetches bounded
file content at the resolved commit SHA. The 3D view caps visible nodes at 500;
tree search displays up to 200 matches at a time. GitHub App sign-in and private
repository listing work only after configuring the app and installing it on
target accounts. Live dependency analysis, richer filters, and production
deployment remain outstanding. Do not treat
fixture data as live GitHub data. The intended scope and acceptance criteria live in
[`docs/`](docs/README.md).

## Optional GitHub App sign-in

For the current read-only exploration flow, register a GitHub App with **Contents: read-only** and **Metadata: read-only**
repository permissions. Enable user authorization and expiring user access
tokens. The sign-in flow uses PKCE. Set its callback URL to
`https://localhost:8081/auth/github/callback` for local development. Install the
app on accounts and repositories users should be able to browse.

Copy `.env.example` to `.env` only if you do not already have a local `.env`.
Set `GITHUB_APP_CLIENT_ID`, `GITHUB_APP_CLIENT_SECRET`, `GITHUB_APP_SLUG`,
`GITHUB_APP_CALLBACK_URL`, and `WEB_ORIGIN`. Keep `.env` private. The API keeps
tokens and sessions in process memory; API restarts sign users out. Use one API
instance until a shared session store is added.
