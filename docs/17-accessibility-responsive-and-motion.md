# 17 — Accessibility, Responsive Design, and Motion

## Principle

The 3D world is an additional way to understand code, not the only way to use the product. Critical tasks must remain possible through standard 2D controls.

## Keyboard support

- All main navigation and panel controls can receive keyboard focus.
- Search can be opened and used without a pointer.
- Search results can be activated by keyboard.
- File-tree nodes can be expanded/collapsed and selected.
- Inspector actions such as copy path and open on GitHub are keyboard-operable.
- Escape closes transient overlays or clears selection according to documented behavior.
- Focus indicators are visible.

## Screen-reader support

- Use semantic HTML for all 2D controls and panels.
- Provide meaningful accessible names for icon-only buttons.
- Announce repository loading and errors through appropriate live regions.
- Expose selected file name/path and dependency counts in the 2D inspector.
- Do not rely on WebGL canvas content as the sole source of information.
- Provide a structured file tree and relationship list as alternatives to spatial perception.

## Color and visual encoding

- Do not communicate file type, selection, or relationship status through color alone.
- Use labels, icons, outlines, line patterns, and text where useful.
- Maintain readable contrast in panels and controls.
- Ensure selection remains distinct from hover and dependency highlighting.

## Reduced motion

- Respect the operating system's reduced-motion preference when practical.
- Offer a user override.
- In reduced-motion mode, use instant camera focus or short transitions.
- Avoid continuous idle movement, unnecessary parallax, and camera shake.
- Make the 2D-to-3D transition skippable.

## Responsive behavior

Desktop is the primary target for the immersive scene. On small screens:
- Panels may become drawers or tabs.
- Keep repository search, tree, and inspector available.
- Reduce visible labels and effects.
- Support touch camera gestures only when they do not conflict with page scrolling.
- Provide a useful 2D navigation mode if full 3D interaction is awkward.

## Acceptance criteria

- A user can locate and inspect a file without relying on color alone.
- Core actions are possible with keyboard-accessible 2D controls.
- Reduced-motion preference suppresses nonessential animations.
- WebGL failure does not remove repository access.
- Mobile layout avoids unusable overlapping panels.
