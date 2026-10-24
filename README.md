# GitHub 3D — Code as a World

IWSDK app that turns a revision-scoped repository tree into a navigable 3D scene.
The current build uses a small synthetic fixture; it makes no live GitHub requests.

## Run

Requires Node.js version from `.nvmrc` and dependencies installed with `npm install`.

```sh
npm run dev
npm run typecheck
npm test
npm run build
```

Use the managed browser's Runtime and Editor controls to switch between the app
and authored scene.

## Current demo

The `tiny-ts` fixture demonstrates revision-bound file metadata, spatial file and
directory nodes, tree selection, a bounded source preview, and literal JS/TS
imports. Unresolved imports remain explicit. Source is rendered as text.

GitHub OAuth, authenticated repository listing/import, server API, full search,
and production deployment are not implemented yet. Do not treat the fixture as
data fetched from GitHub. The intended scope and acceptance criteria live in
[`docs/`](docs/README.md).
