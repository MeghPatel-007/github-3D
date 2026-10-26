# GitHub 3D — Experience and Visual Design

## Product intent

GitHub 3D should feel like entering a repository, not opening a conventional dashboard with a 3D widget attached. The main journey is **sign in with GitHub → choose or import a repository → enter its 3D world**. Keep repository selection short and make the world the primary workspace after entry.

GitHub 3D is a GitHub Desktop-style client with a 3D repository world as its primary work surface. The initial explorer is read-only, but the final product must support real repository workflows: branches, change review, staging, commits, synchronization, conflict recovery, and history. Never show an action as available or successful until it is specified, implemented, and confirmed by the Git engine. Keep a full 2D route for precise work and accessibility.

## Experience principles

- **World first, controls close at hand.** Give the repository scene most of the screen. Keep search, navigation, status, and inspector controls in compact 2D panels that can be opened when needed.
- **The 3D world is the main workspace.** After a managed workspace opens, show its branch, HEAD, working-tree and sync state in world-space UIKitML, with spatial paths to supported Git operations. Prioritize completing and verifying this experience in the XR simulation. Use shadcn/ui for the companion 2D browser interface and its keyboard-accessible controls; completion of the 2D interface does not count as completion of the 3D work.
- **Git operations stay recognizable.** Branch, sync, staged/unstaged, commit, and conflict states must use clear developer-tool language. 3D can add spatial context, but should not obscure conventional diffs or Git concepts.
- **Spatial structure should explain the repository.** Use folders as recognizable groups or districts and files as selectable objects. Keep hierarchy and names understandable; visual spectacle must not make browsing slower.
- **Blue wires and directory containers form the world.** Use open wireframe directory containers for hierarchy, compact file blocks inside them, and thin blue wires (`#58A6FF`) for real resolved dependencies. Selection glows mint (`#9BF0D0`); conflicts use the established red accent (`#F78166`) plus a text label. Keep containment links distinct from dependency wires and never invent connections.
- **Keep the UI toolkits on their intended surfaces.** Use shadcn/ui for 2D browser DOM controls. Build spatial controls and feedback with IWSDK/UIKitML and the existing runtime; do not treat DOM overlays as a replacement for in-world UI.
- **Keep a precise 2D route.** Every core browse and inspect action must remain usable through a file tree, search results, and a source inspector. 3D is the primary way to explore, not a gate to repository information.
- **Show only evidence-backed relationships.** Draw dependency edges only when analysis resolves them. Label unresolved or unsupported imports honestly and provide a legend.
- **Preserve revision identity.** Show the selected repository and resolved commit SHA in the workspace. Do not visually mix information from different revisions.
- **Make state legible.** Loading, empty, selected, focused, stale, truncated, permission, and error states need clear text and distinct visual treatment.

## Primary user flow

1. The visitor sees a simple GitHub 3D introduction and a clear **Continue with GitHub** action; a public demo can be available where supported.
2. After authorization, the user chooses an accessible repository or imports a public repository URL.
3. Show concise loading progress while metadata, the resolved commit, and the tree are prepared.
4. Open or clone a repository and enter its world with the root, current branch, and working-tree state visible.
5. The user searches or explores folders, selects a file, reviews its diff or source, and stages changes where supported.
6. The user can commit, synchronize, and recover from Git conflicts through clear operations and progress states.
7. The user can inspect history and optionally reveal supported dependency links.
8. The user can switch repositories without losing or silently discarding local work.

Do not add a full dashboard step between login and the world unless a product decision requires it. Repository selection can be a lightweight transition or a world-adjacent chooser as long as access, progress, and errors remain clear.

## Workspace composition

### 3D scene

- Treat the repository root as the primary landmark and make the current location easy to identify.
- Arrange directories as spatial groups and files as distinct, selectable objects. Prefer stable, deterministic layouts over decorative randomness.
- Use labels at useful viewing distances; reduce clutter at overview scale and reveal detail as the user focuses or approaches.
- Distinguish hover, selection, keyboard focus, and dependency highlighting. Do not communicate these states with color alone.
- Provide camera focus and reset controls, plus a way to recover from disorientation.
- Avoid continuous idle motion, camera shake, unnecessary particles, and large transitions. Motion should communicate focus, navigation, or loading.
- Use a central repository hub, stable directory containers arranged around it, and compact file blocks within each container. Keep the scene sparse at overview scale; reveal names and connected blue dependency wires when the user focuses a directory or file. The detailed replication brief and sketch live in [`../26-spatial-git-workflows.md`](../26-spatial-git-workflows.md).

### 2D controls and panels

Use shadcn/ui components for the 2D browser DOM interface where appropriate.
Keep this layer connected to the same workspace state and typed APIs as the 3D
world, and keep its scope focused on browser navigation, accessible Git
controls, dialogs, and detailed inspection. It complements the spatial
environment; it does not replace it.

- **Workspace header:** repository owner/name, branch or requested ref, resolved commit SHA, and import/session status.
- **Git status and actions:** active branch, ahead/behind state, staged/unstaged summary, fetch/pull/push status, commit action, and conflict state. Only show operations supported by the actual workspace.
- **Navigation/search:** searchable file tree with clear folder expansion and selected-file state.
- **Inspector and diff:** selected file or directory metadata, accurate staged/unstaged diff, source preview when relevant, truncation notice, and an external GitHub link when available.
- **Scene controls:** focus, reset view, and dependency visibility/filtering with a short legend.
- **Feedback:** concise loading progress, empty-state guidance, retryable errors, permission notices, and rate-limit messaging.

Keep panels compact and avoid covering the main object of focus. On smaller screens, use collapsible panels, drawers, or tabs and prioritize search, tree, and source inspection; allow 3D to become optional when its controls would be cramped.

## Visual language

Use a calm developer-tool palette with a dark neutral canvas, readable light text, restrained green/mint accents, and subtle panel borders. The current UI palette is the starting point: background `#0d1117`, panel border `#303b49`, primary text `#e6edf3`, muted text near `#9aa8b6`, green action `#238b6d`, and mint focus/selection accents near `#58d6b1` / `#9bf0d0`. Treat these as existing implementation tokens to consolidate, not immutable brand specifications.

- Use typography suited to both interface labels and source code; reserve monospace for paths, commit IDs, and code.
- Keep contrast readable in the scene and panels. Use labels, shapes, line patterns, and icons alongside color.
- Use consistent shapes for node types and consistent line styles for relationship states.
- Use borders and background changes sparingly to create hierarchy rather than a stack of competing cards.
- Keep focus indicators visible and distinct from hover and selection.

## Accessibility and comfort

- All authentication, repository selection, Git operations, search, file-tree, inspector, and scene-control actions must be keyboard reachable and have visible focus.
- Use semantic 2D controls with accessible names. Announce loading and errors; do not make the WebGL canvas the only source of information.
- Respect reduced-motion preferences and provide short or instant focus transitions.
- Do not require color vision, precise pointing, or spatial navigation to locate and inspect a file.
- Keep touch targets usable and ensure panels do not obstruct the scene or page controls on narrow screens.

## Content and trust

- Render repository source strictly as escaped text; never execute it as HTML or application code.
- Mark truncated, unsupported, or unavailable file content explicitly.
- Show a link to GitHub as the canonical source when appropriate.
- Never expose access tokens, secret values, raw stack traces, or private repository data in interface messages.
- Make the distinction between demo fixture data and live GitHub data visible.

## Related specifications

- Product scope and user journey: [`../01-product-requirements.md`](../01-product-requirements.md)
- Component and state contract: [`../20-design-system-and-ui-components.md`](../20-design-system-and-ui-components.md)
- 3D rendering and scene models: [`../11-3d-rendering-and-scene-models.md`](../11-3d-rendering-and-scene-models.md)
- 3D navigation and interactions: [`../05-three-d-world-and-interactions.md`](../05-three-d-world-and-interactions.md), [`../13-camera-controls-and-input.md`](../13-camera-controls-and-input.md)
- Accessibility and responsive behavior: [`../17-accessibility-responsive-and-motion.md`](../17-accessibility-responsive-and-motion.md)
