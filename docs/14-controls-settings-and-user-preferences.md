# 14 — Controls, Settings, and User Preferences

## Settings principles

Settings should be few, understandable, and safe. Do not expose dozens of Three.js tuning parameters to end users. Separate user-facing preferences from developer-only debug configuration.

## User-facing settings

### Navigation
- Control help/legend.
- Reset camera.
- Default start view: overview or last view (optional).
- Camera animation: enabled/disabled.
- Reduced motion: enabled/disabled, defaulting to system preference where practical.

### Scene visibility
- Show/hide file labels.
- Show/hide directory bounds.
- Show/hide dependency edges.
- Edge filter: incoming, outgoing, both, none.
- Show/hide file-tree panel.
- Show/hide inspector.
- Collapse/expand directory subtree.

### Visual effects
- Effects preset: low / standard.
- Bloom or post-processing toggle, if included.
- Label density/level of detail.
- Optional theme setting if multiple themes are actually supported.

### Repository
- Active repository and commit SHA.
- Refresh repository data.
- Return to dashboard.
- Clear recent repository list, if recents exist.

## Developer/debug settings

Keep these behind a development-only or explicit diagnostics mode:
- Show node IDs.
- Show bounding boxes.
- Show object axes and world origin.
- Show layout grid.
- Display visible object/edge counts.
- Display FPS and scene initialization time.
- Freeze layout/physics simulation.
- Log layout diagnostics without source contents or credentials.

Debug settings must not leak into production by default.

## Suggested settings model

```ts
export interface WorldPreferences {
  cameraAnimations: boolean;
  reducedMotion: boolean;
  showFileLabels: boolean;
  showDirectoryBounds: boolean;
  showDependencyEdges: boolean;
  edgeMode: "incoming" | "outgoing" | "both" | "none";
  showFileTree: boolean;
  showInspector: boolean;
  effects: "low" | "standard";
  labelDensity: "selected-only" | "nearby" | "all-visible";
}

export const defaultWorldPreferences: WorldPreferences = {
  cameraAnimations: true,
  reducedMotion: false,
  showFileLabels: true,
  showDirectoryBounds: true,
  showDependencyEdges: true,
  edgeMode: "both",
  showFileTree: true,
  showInspector: true,
  effects: "standard",
  labelDensity: "nearby",
};
```

Apply system reduced-motion preference when initializing the user preference, then allow explicit user override. Keep persisted settings versioned so future schema changes can be migrated.

## Persistence policy

- MVP: in-memory settings or browser-local preferences are sufficient.
- Do not persist OAuth tokens or private source content in local storage.
- If using local storage for preferences, validate loaded values and tolerate malformed data.
- Use a database only if cross-device preferences are required.
- Recent repository persistence must respect privacy and should be clearable.

## Settings behavior

- Settings apply immediately where safe.
- Reset settings returns to documented defaults.
- Changing visual effects must not trigger a full repository reimport.
- Hiding edges must not delete dependency data.
- Collapsing a directory must not delete child nodes from the canonical model.
- Camera settings must not alter repository metadata.

## Acceptance criteria

- All user-facing controls have labels/tooltips and clear active states.
- Reset restores defaults.
- Reduced-motion mode removes or shortens nonessential camera animations.
- Preferences do not contain credentials.
- Invalid saved settings fall back safely.
