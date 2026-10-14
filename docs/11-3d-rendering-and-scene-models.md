# 11 — 3D Rendering and Scene Models

## Status and scope

This document specifies the intended rendering architecture for GitHub 3D. It does not imply that all scene models have already been implemented. Use procedural Three.js geometry for the MVP; external 3D assets are optional and must not become a dependency for basic navigation.

## Rendering stack

- React Three Fiber: React integration for Three.js scenes.
- Three.js: scene graph, cameras, geometry, materials, raycasting, and rendering.
- Drei: selected helpers such as camera controls, text, environment, and performance utilities.
- Optional post-processing: use sparingly and only after profiling.
- Optional GLTF/GLB assets: only for decorative, optimized assets with a documented license.

Pin package versions during implementation and verify APIs against those installed versions.

## Scene graph

Suggested hierarchy:

```text
RepositoryWorld
├── WorldLighting
├── RepositoryHub
├── DirectoryZones
│   ├── DirectoryZone
│   │   ├── DirectoryLabel
│   │   └── FileObjects
│   └── ...
├── DependencyLayer
│   ├── DependencyEdges
│   └── EdgeHighlights
├── SelectionLayer
│   ├── HoverHighlight
│   └── SelectedHighlight
├── NavigationHelpers
│   ├── GridOrGround
│   └── MinimapMarkers
└── CameraRig
```

Keep UI panels in regular DOM/React layout outside the WebGL canvas wherever possible. Use 3D labels only for short world-context labels; show long names and source text in 2D panels.

## Core scene models

### Repository hub
- Purpose: communicate the root of the loaded repository.
- Representation: central platform, hub, or compact landmark.
- Data: repository name and active commit SHA.
- Interaction: focus overview, show repository metadata.
- Constraint: avoid a giant decorative object that hides directory groups.

### Directory zone
- Purpose: spatially group a directory and its descendants.
- Representation: platform, room boundary, frame, or lightweight volume.
- Data: directory node ID, child count, collapsed/expanded state.
- Interaction: focus, expand/collapse, show child summary.
- Constraint: nesting must remain readable; do not create fully enclosed rooms that obstruct the camera.

### File object
- Purpose: selectable representation of a file.
- Representation: compact box, card, tile, or simple icon-like mesh.
- Data: node ID, extension, size, selection state.
- Interaction: hover, select, focus.
- Constraint: use shared geometries/materials or instancing where measured to help performance.

### Dependency edge
- Purpose: show a detected relationship between files.
- Representation: line, tube, curve, or thin directed connector.
- Data: source ID, target ID, relationship kind, resolution status.
- Interaction: hover/select where practical.
- Constraint: edges must not imply a relationship absent from analysis data. Use distinct styling for unresolved relationships; do not draw a fake target.

### Selection highlight
- Purpose: show the active object and related objects.
- Representation: outline, emissive material, ring, or restrained highlight.
- Data: selected node ID and interaction state.
- Constraint: selection styling must remain distinguishable from dependency-edge styling.

## Geometry strategy

Prefer primitive geometry in the MVP:
- `BoxGeometry` for file blocks.
- `PlaneGeometry` or thin boxes for directory platforms.
- `Line`/`BufferGeometry` for dependency connections.
- Shared materials for file categories.
- Text rendered with a selected Drei text helper or DOM overlays, after checking font loading and performance.

Do not create unique heavy geometry and material instances for every file unless profiling justifies it. Dispose of resources created dynamically when scenes or repositories are replaced.

## Materials and visual encoding

Recommended defaults:
- Dark neutral environment.
- Restrained accent colors.
- A consistent palette for file categories.
- Separate visual states for hover, selection, unresolved edge, and disabled/collapsed node.
- High enough contrast for color-vision differences; never encode meaning by color alone.
- Reduced-effects mode that disables expensive bloom and excess glow.

Color values should be centralized in a theme/config module rather than duplicated through scene components.

## Labels

- Keep labels short and legible.
- Apply level-of-detail rules: show directory names at overview zoom; show file names when closer or selected.
- Prevent labels from consuming unbounded screen space.
- Avoid placing long source snippets in 3D.
- Provide the exact path in the 2D inspector.
- Handle font-load failures with a fallback or hide labels while keeping the 2D tree functional.

## Optional external assets

External models are not required for the MVP. If GLTF/GLB assets are introduced:
- Prefer low-poly, compressed assets.
- Document source, license, file size, and intended use.
- Avoid downloading remote assets at runtime without a clear reason.
- Provide a procedural fallback.
- Do not use assets that obscure file/dependency semantics.

## Acceptance criteria

- The same repository revision and layout settings produce a stable arrangement.
- Every interactive file object maps to a real node ID.
- Scene changes do not mutate canonical repository metadata.
- Switching repositories releases old scene resources.
- No decorative asset is required for core functionality.
- Selection, labels, and edges remain understandable with post-processing disabled.
