# 12 — Physics and Spatial Layout

## Critical design decision

**A full physics engine is not required for the MVP.** GitHub 3D is a structured developer visualization, not a physics game. Directory and file positions should primarily be produced by a deterministic layout algorithm. Physics may later be added as a limited, optional enhancement.

This avoids unstable layouts, unnecessary CPU cost, and objects drifting away from their parent directories.

## MVP: deterministic layout, not simulation

Use a hierarchical grid/radial/cluster layout:
1. Repository root at the origin or another stable anchor.
2. First-level directories arranged around the hub.
3. Nested directories positioned within or adjacent to their parent zone.
4. Files placed on a grid or ring within their directory region.
5. Dependency edges rendered as an overlay between computed object positions.
6. Collapsed directories represented by a summary object with child counts.

The layout must be repeatable for the same revision and configuration. Derive positions from stable node IDs/order and layout settings, not random values on every render.

## Spatial layout configuration

Create a central configuration object. Values below are initial tuning defaults, not final measured values.

```ts
export interface LayoutSettings {
  mode: "hierarchical-grid" | "radial-clusters";
  rootRadius: number;
  directorySpacing: number;
  fileSpacing: number;
  directoryPadding: number;
  maxVisibleDepth: number;
  maxVisibleFilesPerDirectory: number;
  collapseThreshold: number;
  showDirectoryBounds: boolean;
}

export const defaultLayoutSettings: LayoutSettings = {
  mode: "hierarchical-grid",
  rootRadius: 8,
  directorySpacing: 12,
  fileSpacing: 1.6,
  directoryPadding: 2,
  maxVisibleDepth: 5,
  maxVisibleFilesPerDirectory: 80,
  collapseThreshold: 100,
  showDirectoryBounds: true,
};
```

Tune these settings using representative repositories. The numeric values are world units, not meters or real-world dimensions.

## Optional physics phase

If physics is introduced later, use it only for a clearly defined purpose such as gentle collision avoidance or an optional force-directed overview. Do not allow physics to alter the canonical hierarchy or silently move objects between directory groups.

Potential choices:
- A lightweight custom separation/collision solver for small local interactions.
- A graph-layout/force simulation library for an optional dependency overview.
- A full physics engine such as Rapier only if genuine physical interactions become a product requirement.

Do not add a physics package merely because the environment is 3D. First prove that a layout problem cannot be solved deterministically.

## Physics rules if enabled

- Physics is opt-in and can be disabled.
- Simulated positions are a presentation layer, not repository data.
- Parent-directory membership remains explicit even if nodes are visually displaced.
- Simulation must settle within a bounded time or allow users to freeze it.
- Clamp velocities and world bounds.
- Use collision radii based on object size.
- Avoid applying forces to hundreds or thousands of labels/edges.
- Do not simulate dependency edges as ropes by default.
- Preserve a stable saved/restored layout for the active revision.
- Ensure camera focus and selection work during and after settling.
- Provide a reduced-motion option.

## Force-directed layout is not physical truth

If a force-directed algorithm is used, forces are a visualization technique. Distances and clusters must not be presented as evidence of actual runtime dependency strength, execution order, or ownership.

## Acceptance criteria

- Reloading the same revision does not produce a completely different layout.
- Layout generation does not require a physics engine.
- Physics, if enabled, cannot corrupt repository relationships.
- Users can stop motion and restore a stable layout.
- Performance remains acceptable with the chosen visible-object budget.
