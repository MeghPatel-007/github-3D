# Repository Fixtures and Demo Scenarios

**Status:** MVP test-data specification  
**Project:** GitHub 3D: Code as a World

## 1. Purpose

Provide deterministic, safe, repeatable repositories for development, demos, testing, and performance checks. Fixtures must not require a live GitHub connection and must not contain secrets or copyrighted source copied without permission.

## 2. Fixture design

Create small synthetic repositories with clearly licensed or original source files. Store fixtures under a path such as:

```text
tests/
  fixtures/
    tiny-ts/
      manifest.json
      tree.json
      files/
    mixed-project/
      manifest.json
      tree.json
      files/
    large-project/
      manifest.json
      tree.json
      files/
```

Each `manifest.json` should identify:
- Fixture ID and description.
- Synthetic revision SHA.
- Languages represented.
- Expected file and directory counts.
- Expected resolved, unresolved, and external dependency counts.
- Expected unsupported-file count.
- Intended test scenarios.

## 3. Required fixtures

### `tiny-ts`
A minimal TypeScript project containing:
- One entry file.
- One local imported module.
- One file with no imports.
- One unresolved local import.
- A README.

Purpose: prove the basic tree and edge pipeline.

### `mixed-project`
A synthetic project containing:
- Nested directories.
- JavaScript and TypeScript.
- JSX/TSX.
- JSON and CSS imports.
- An external package import.
- A circular import pair.
- A file with an unusual but valid path.
- An empty directory only if the source-control representation supports it.

Purpose: exercise resolution and visual encodings.

### `partial-and-invalid`
A fixture representing:
- Unsupported syntax or language.
- An oversized file represented by metadata rather than a huge committed payload where possible.
- Truncated tree results.
- Malformed or incomplete API responses.
- Missing content for one file.

Purpose: verify graceful degradation and honest coverage reporting.

### `large-project`
Generated deterministically from a seed:
- Hundreds of directories and files.
- A configurable dependency graph.
- A range of degree distributions.
- A known count of nodes and edges.

Purpose: benchmark layout, filtering, search, and rendering. Do not rely on random values without a fixed seed.

### `revision-mismatch`
Tree, content, and dependency fixtures with deliberately different SHAs.

Purpose: verify that mixed revisions are rejected or refreshed instead of silently combined.

## 4. Demo flow

1. Open the landing page.
2. Select “Explore demo repository.”
3. Show an import progress state.
4. Enter the 3D world at a stable initial camera position.
5. Select a directory and observe its details.
6. Select a file and open source preview.
7. Search for a filename and focus it.
8. Toggle dependency edges and explain resolved versus unresolved links.
9. Use the 2D file-tree fallback.
10. Reset the camera and return to the repository dashboard.

The demo must not claim that fixture data was fetched from a live GitHub repository.

## 5. Golden expectations

For each fixture, check:
- Normalized path list.
- Node kinds and parent-child relationships.
- Dependency edges and their resolution statuses.
- Stable node IDs.
- Layout determinism.
- Selected-node lookup.
- Search results.
- Behavior under missing or truncated content.

Prefer semantic assertions over screenshot-only assertions.

## 6. Screenshot and visual tests

Capture a small set of stable scenes:
- Initial overview.
- Selected file with inspector.
- Dependency-highlight mode.
- Dense scene with edge filtering.
- Empty/error/fallback state.

Fix camera position, viewport size, fixture revision, and random seed. Use tolerant visual comparisons to avoid brittle GPU-specific tests.

## 7. Acceptance criteria

- Every demo works offline after installation.
- Fixtures contain no credentials or private user data.
- Expected graph outputs are checked into source control.
- The large fixture is deterministic.
- Revision mismatch and partial-analysis cases are covered.
