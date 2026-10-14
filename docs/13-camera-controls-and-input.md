# 13 — Camera Controls and Input

## Goals

The camera must let users understand the whole repository, move to a directory, and inspect an individual file without fighting the controls. The 2D explorer remains available for precise navigation.

## Recommended control approach

Use React Three Fiber and a compatible Drei camera-control helper. Choose either:
- `OrbitControls` for a simple orbit/zoom/pan interaction, or
- `CameraControls` for more explicit smooth camera transitions and focus operations.

Do not mount two independent camera controllers on the same camera. Verify the exact APIs and options against the installed Drei version.

## Initial desktop control defaults

These are starting values for usability testing, not final guarantees.

```ts
export const cameraSettings = {
  minDistance: 4,
  maxDistance: 180,
  minPolarAngle: 0.12,
  maxPolarAngle: Math.PI * 0.48,
  enableDamping: true,
  dampingFactor: 0.08,
  rotateSpeed: 0.7,
  zoomSpeed: 0.9,
  panSpeed: 0.8,
  focusDurationSeconds: 0.6,
};
```

Some values may need to be mapped to the API of the selected controller. Avoid copying this object directly into a controller without verifying supported properties.

## Mouse and keyboard behavior

- Left drag: orbit, if consistent with the selected control helper.
- Wheel: zoom.
- Secondary drag or configured modifier: pan.
- Click object: select.
- Escape: clear transient selection/close overlay when appropriate.
- Search result activation: focus the matching node.
- Reset button: return to overview.
- Dashboard button: leave the world without losing safe repository context.

The final mapping must be documented in the UI because control defaults differ between libraries and devices.

## Focus behavior

When focusing an object:
1. Resolve its current world position.
2. Choose a camera offset based on object type and current zoom.
3. Animate to the target over a short duration.
4. Keep controls usable during/after the animation.
5. Cancel the animation if the user starts manual navigation.
6. Handle objects hidden inside collapsed directories by expanding or explaining why they cannot be focused.

## Camera presets

Recommended presets:
- **Overview:** show repository hub and top-level directories.
- **Directory:** frame a selected directory and visible children.
- **File:** focus a selected file with enough nearby context to understand relationships.
- **Dependency:** frame selected file and its immediate resolved neighbors.

## Mobile and accessibility

- Do not rely only on hover.
- Provide buttons for focus, reset, expand/collapse, and return.
- Make search and tree navigation keyboard-operable.
- On touch devices, support standard one-finger orbit and two-finger pan/zoom where the chosen control helper allows it.
- Avoid gesture conflicts with scrolling DOM panels.
- Respect reduced-motion preferences and provide instant-focus alternatives.

## Acceptance criteria

- Users can return to overview from any focused object.
- Camera animations can be interrupted.
- Controls do not block clicks on selectable objects.
- Zoom is bounded and does not invert the camera.
- Keyboard/2D controls remain usable when pointer controls are unavailable.
