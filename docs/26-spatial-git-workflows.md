# Spatial Git Workflows — Ralph Handoff

## Goal

Finish TASK-14 by bringing the real Git workspace UI into the world-space IWSDK
experience. Git controls currently live in browser DOM overlays. The spatial
`repo-panel` shows the repository tree and inspector, so DOM-only changes are
not visible in the XR simulation. The 3D repository environment is the primary
deliverable and must receive the main design and implementation effort. Build
its Git workflow in IWSDK/UIKitML and its runtime system. Use shadcn/ui for the
2D browser interface where it fits; that interface is the complete
keyboard-accessible companion and fallback, not a substitute for the spatial
work.

### Surface ownership and priority

1. **Primary: IWSDK 3D environment.** Complete the repository hub, directory
   containers, file nodes, evidence-backed blue wires, and in-world Git status
   and actions described below. The XR simulation must visibly reflect the
   feature; a polished browser panel alone does not complete the task.
2. **Companion: 2D browser interface.** Use shadcn/ui components for the DOM
   browser experience, including repository selection, navigation, status,
   dialogs, and accessible controls. Integrate with the existing Vite app as
   needed, keeping the change scoped and preserving the existing typed APIs and
   shared events.
3. **Spatial UI remains native to the project.** Implement in-world controls
   with IWSDK/UIKitML and its runtime. Do not mount shadcn/React DOM components
   into the 3D scene or replace the spatial panel with an HTML overlay.

Work in this priority order. Verify the browser surface and the 3D runtime
surface separately, and report the evidence for each. Passing the 2D checks
cannot stand in for spatial acceptance.

## Current implementation map

- Scene node ID: `repo-panel` in `public/scenes/main.iwsdk.scene.json`.
- Manifest asset ID: `repo-panel` in `src/assets.ts`.
- Spatial UI: `public/ui/repo-panel.uikitml`.
- Spatial runtime and shared selection events: `src/repo-explorer.ts`.
- DOM Git controls: `src/branch-ui.ts` and `src/change-ui.ts`, mounted by
  `src/repository-ui.ts`.
- Existing typed service calls: `src/workspace-api.ts` and `src/change-api.ts`.
- Workspace branch/status updates use the `workspace:branch-state` event;
  selection is shared through `repo:select` and `repo:selected`.

Keep the manifest ID, scene node ID, and UIKitML element IDs distinct and
stable. Extend the existing spatial panel/runtime pair; do not make a second
renderer or move the product back to a DOM-first dashboard.

## Visual concept to reproduce

The imagined workspace is a dark, calm code world built from **directory
containers and blue connection wires**. Keep the repository recognizable as a
structured workspace rather than a cloud of unrelated cubes:

- Place one solid repository hub at the center as the spatial anchor.
- Represent each directory as a clear, open-sided wireframe container or
  outlined platform. Nest or group child containers deterministically so the
  repository hierarchy reads at a glance.
- Place file nodes inside their parent container as compact rectangular cards
  or blocks. Give files a restrained size or height cue; keep names readable
  when focused and avoid labels covering the whole overview.
- Use thin, luminous blue wires (`#58A6FF`) for repository connections. Use
  subtle hub-to-container tethers only to explain hierarchy. Use directed
  file-to-file wires only for dependency edges resolved from repository data;
  never draw speculative links. Make containment and dependency connections
  visually distinct.
- Selecting a file should brighten its node with the existing mint accent
  (`#9BF0D0`) and emphasize its connected, evidence-backed wires. Keep the
  same selection visible in the tree, inspector, and diff.
- Keep Git state legible without relying on wire color: show branch, HEAD,
  staged/unstaged counts, and ahead/behind in a compact world-space workspace
  console. Use the existing red accent (`#F78166`) for conflicts and a clear
  text label for every state.
- Use restrained glow, stable geometry, and deliberate spacing. No random
  rearrangement, constant motion, dense decorative wire grids, or glow that
  makes labels hard to read. Preserve a clear camera path from the hub to each
  directory container.

Concept sketch (top-down, not to scale):

```text
                    +------------------+
                    |  src container   |
                    | [index.ts]       |
                    | [api.ts]         |
                    +------------------+
                       \  blue dependency wire
                        \____________________
                         \
                    [ repository hub ]
                      /            \
          +----------------+   +----------------+
          | tests container|   | docs container |
          | [api.test.ts]  |   | [README.md]    |
          +----------------+   +----------------+

    [workspace console: branch · HEAD · status · sync · actions]
```

The production layout should remain deterministic and adapt to repository
size. The sketch defines the visual grammar, not fixed positions or a required
number of containers.

## Required spatial behavior

1. Show the active repository, branch, HEAD, working-tree counts, and ahead/
   behind state in world-space UI after a managed workspace opens. Refresh it
   after branch, change, commit, and sync operations.
2. Provide usable spatial paths for branch management and fetch/pull/push.
   Pull and push need an explicit in-world confirmation step; do not rely on
   browser `window.confirm` in immersive mode.
3. Let a user select a changed file in the world/tree, inspect its staged and
   unstaged diff, and perform supported file-level stage, unstage, and
   confirmed discard actions.
4. Provide a spatial commit flow for staged changes, and expose merge conflict
   inspection plus explicit abort/continue actions when those operations are
   available.
5. Carry through the available history/comparison and GitHub context actions
   where they fit the existing scope. Clearly label unsupported or unavailable
   operations; do not show an action as successful before the Git/API response
   confirms it.
6. Keep selection and visible state synchronized across the spatial panel,
   scene objects, tree, diff, inspector, and existing DOM controls. Use the
   existing typed APIs and event contracts rather than duplicating Git logic.

Use compact UIKitML sections or tabs if the full workflow does not fit in one
panel. Keep status, progress, empty, disabled, confirmation, success, and error
states legible at runtime. Reuse the current visual language and preserve the
repository scene and its existing tree/inspector behavior.

## Verification and limits

- Follow `.agents/skills/iwsdk-ui/SKILL.md` and the bounded runtime workflow in
  `.agents/skills/iwsdk-dev/references/iterate.md`.
- Verify the registered asset, UIKitML preview, and managed runtime state. Drive
  at least one representative spatial Git action with actual runtime input and
  confirm its resulting named UI/state, then run the production build.
- Capture and include screenshots of every implemented UI surface and
  significant state for review. This includes the 2D browser interface and the
  3D environment in the managed runtime, plus relevant dialogs, menus, empty or
  loading states, and Git action results. Save screenshots in the project’s
  existing evidence location (or create a clearly named folder under `docs/`)
  and link each image from the task report so the user can review the full UI.
  Do not substitute mockups or fixture-only images for runtime screenshots;
  label any state that could not be captured and explain why.
- The owner uses the desktop browser and has no headset. Use the IWSDK managed
  browser/runtime or its supported emulated input; do not require a physical
  headset or use `metavr` for this task.
- A fixture screenshot proves only that the panel renders. It does not prove a
  managed workspace action, 2D/3D synchronization, keyboard fallback, or
  representative performance. Record any gate that remains unverified and keep
 TASK-14/TASK-15 open until its acceptance criteria are actually met.
