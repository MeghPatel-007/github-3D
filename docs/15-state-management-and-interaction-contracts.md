# 15 — State Management and Interaction Contracts

## Purpose

Define how UI, repository data, selection, and scene rendering stay synchronized. Avoid storing the same truth independently in unrelated components.

## State domains

### Session state
- Signed-in/signed-out/loading/error.
- User display metadata necessary for the UI.
- No raw privileged token in client state.

### Repository state
- Owner and repository name.
- Selected ref and resolved commit SHA.
- Loading status and normalized model.
- Import error and progress.

### Interaction state
- Selected node ID.
- Hovered node ID.
- Expanded/collapsed directory IDs.
- Search query and selected result.
- Active inspector tab.

### View state
- Camera preset/target.
- Panel visibility.
- Edge filters and label density.
- User preferences.

### Analysis state
- Analyzer status and progress.
- Analysis revision/configuration.
- Resolved and unresolved edges.
- Parse errors and unsupported-language notes.

## Source of truth

- The normalized repository model owns file/folder relationships.
- The analysis result owns detected dependency edges.
- The layout engine owns derived world coordinates.
- The selection store owns selected node ID.
- The camera controller owns transient camera motion.
- The preferences store owns user-configurable display settings.

Do not copy repository node objects into camera state or embed world coordinates in repository nodes.

## Interaction contracts

### Select file in scene
1. Validate the node ID exists in the active model.
2. Set selected node ID.
3. Synchronize file-tree selection.
4. Open inspector and fetch revision-scoped content if needed.
5. Highlight incoming/outgoing edges according to settings.
6. Optionally focus camera, unless the user has disabled automatic focus.

### Select file in tree/search
1. Set the same selected node ID used by the scene.
2. Expand parent directories in the tree as needed.
3. Reveal/focus the scene object if visible.
4. Open inspector.
5. Handle collapsed/filtered objects predictably.

### Switch repository or revision
1. Cancel outstanding requests for the old context.
2. Clear selection/hover and stale analysis.
3. Load metadata and revision-scoped model.
4. Replace scene objects and dispose of old resources.
5. Reset or restore camera according to documented behavior.
6. Ignore any late response belonging to the old context.

### Toggle dependency edges
Change only rendering visibility/filter state. Do not discard the analysis model.

### Collapse directory
Change visibility/layout derivation, not canonical child membership.

## Recommended implementation approach

Use ECS components for state shared with the scene, and a small module store for 2D-only interaction state. Keep request state in the repository domain module with explicit revision-scoped cancellation. Keep transient state local when it is not shared.

Avoid introducing a global state library until cross-component requirements justify it. If one is introduced, document ownership and selectors.

## Acceptance criteria

- Tree, search, scene, and inspector agree on the selected node.
- Switching repositories cannot display stale source or edges.
- Hiding UI/edges does not mutate canonical repository data.
- Selection IDs are validated against the current revision model.
- Asynchronous requests are cancelled or ignored when stale.
