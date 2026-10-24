# 05 — 3D World and Interaction Specification

## 1. Experience principles

- The world should explain repository structure, not merely look like a game.
- The user should always know which repository and revision they are exploring.
- Standard developer tasks must remain efficient through 2D controls.
- Motion should be short, optional, and interruptible.
- Scene complexity must be bounded by visibility and performance.

## 2. Main layout

The desktop world contains:
- Top bar: repository identity, revision, search, view controls, dashboard return.
- Optional left panel: file tree and filters.
- Central viewport: 3D scene.
- Right panel: file inspector and relationship details.
- Optional bottom timeline: commit history in a later release.
- Minimap/overview and legend when useful.

On narrow screens, prioritize file tree, inspector, and basic scene exploration over forcing every panel to remain visible simultaneously.

## 3. Spatial mapping rules

- Repository root: central hub.
- First-level directories: distinct spatial zones.
- Nested directories: nested or adjacent groups.
- Files: selectable objects placed near their parent directory.
- File type: restrained color, icon, or geometry variation.
- Dependency edge: directed connection between source and target files.
- Directory containment: visually distinct from dependency edges.

The layout algorithm must be deterministic for the same revision and settings. Do not randomly rearrange the entire world on every render.

## 4. Layout constraints

- Place objects with enough separation for selection and labels.
- Avoid overlapping high-priority labels at common zoom levels.
- Use level-of-detail rules to hide low-priority labels at a distance.
- Collapse or hide subtrees in very large repositories.
- Use instancing or batching where it improves measured performance.
- Bound edge rendering and provide edge filters.
- Recompute layout only when the model or layout settings change.
- Keep scene coordinates out of canonical repository metadata.

## 5. Camera and selection

Required controls:
- Orbit camera.
- Zoom.
- Pan or equivalent navigation.
- Select object.
- Focus camera on object.
- Reset camera.
- Return to repository overview.
- Escape or equivalent action to clear selection/close overlays.
- Keyboard-operable search, tree navigation, and inspector controls.

Selection must be synchronized across:
- 3D object
- 2D file tree
- search result
- inspector
- dependency highlighting

Selecting a file in one view should select the same file in the others.

## 6. Object interactions

### Hover
Show a subtle outline/highlight and a concise label or tooltip.

### Select
Highlight the selected object, focus the camera when appropriate, and open the inspector.

### Directory select
Allow expand/collapse or focus of the directory region.

### Dependency select
Selecting an edge or connected object should show the relationship type and target/source path.

### Search result
Selecting a result moves focus to the matching object and opens its details.

## 7. 2D-to-3D transition

1. User selects a repository.
2. Data/model loading occurs with visible progress.
3. User activates **Enter 3D World**, or the product may auto-enter after a brief first-run onboarding choice.
4. Dashboard transitions with a short fade/zoom.
5. Camera arrives at the repository hub.
6. Show a concise first-use navigation hint.
7. Provide a skip/reduced-motion option.

Do not make a decorative animation block access while data is still loading. Do not replay a long tutorial every time.

## 8. Inspector behavior

- Show file path, extension/type, size if known, source content, and GitHub link.
- Load content on demand.
- Show loading and error states.
- Keep the panel scrollable independently of the 3D camera.
- Support copying the path.
- For unsupported/large files, show metadata and a link instead of rendering unbounded content.
- Preserve the selected file when switching between tree and scene views.

## 9. Visual design

Recommended direction:
- Dark neutral background.
- Restrained cyan/blue/violet accents.
- Subtle emissive materials.
- Bloom only if it does not reduce readability or performance.
- Consistent visual legend.
- Strong contrast for selection and focus.
- Minimal HUD clutter.
- Reduced-effects mode.

Avoid decorative geometry that obscures relationships or makes the world difficult to navigate.

## 10. Performance and graceful degradation

Initial benchmark target: 30+ FPS on a representative laptop for roughly 500 visible objects. Benchmark on actual target devices before declaring compliance.

If the scene exceeds budgets:
- Collapse distant subtrees.
- Reduce labels.
- Reduce or filter edges.
- Disable expensive post-processing.
- Use instancing/batching.
- Preserve the 2D file tree and inspector.
- Show a message if the scene is intentionally simplified.

Dispose of obsolete Three.js resources and cancel stale asynchronous work when switching repositories.
