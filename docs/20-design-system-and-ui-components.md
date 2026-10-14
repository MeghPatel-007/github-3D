# Design System and UI Components

**Status:** Initial design contract  
**Project:** GitHub 3D: Code as a World

## 1. Design goals

The interface should make a technically complex repository feel navigable without hiding essential engineering details. Use a clean 2D shell around a focused 3D workspace. The 3D scene is the primary exploration surface, not a substitute for searchable lists and source text.

## 2. Layout regions

### Public landing page
- Project title and one-sentence value proposition.
- Short visual explanation of folders, files, and dependency links.
- Primary action: sign in with GitHub or open a public demo.
- Secondary action: view a sample repository.
- Clear notice that private repositories require explicit authorization.

### Repository dashboard
- Repository search and filtering.
- Repository cards with owner/name, language summary when available, privacy indicator, and last-updated metadata when available.
- Import state and actionable errors.
- A demo repository option that does not require sign-in.

### Repository workspace
- Top bar: repository name, selected branch/ref, resolved commit SHA, loading/error state.
- Main area: 3D scene.
- Search/navigation panel: files, folders, symbols when supported.
- Inspector: selected node details and source preview.
- Dependency legend and filtering controls.
- Scene fallback for devices that cannot sustain 3D rendering.

## 3. Visual language

Recommended starting direction:
- Dark neutral background to make scene geometry legible.
- Restrained accent colors, with color never being the only way to communicate node type or status.
- Distinct but consistent shapes for directories, files, and dependency edges.
- Typography optimized for code and metadata.
- Use animation to clarify focus and navigation, not as decoration.
- Keep selected, hovered, loading, warning, and error states visually distinct.

These are initial design choices, not immutable brand rules.

## 4. Component inventory

| Component | Responsibility |
|---|---|
| `AppShell` | Shared page structure and navigation |
| `GitHubSignInButton` | Starts secure authentication |
| `RepositorySearch` | Filters repository list |
| `RepositoryCard` | Presents one repository and import action |
| `ImportProgress` | Communicates tree fetch and analysis stages |
| `WorkspaceHeader` | Shows repository and revision identity |
| `SceneToolbar` | Reset, focus, zoom, and display options |
| `SceneLegend` | Explains node shapes and edge styles |
| `FileTreePanel` | Provides a non-3D navigation alternative |
| `SceneSearch` | Finds files and supported symbols |
| `NodeInspector` | Shows selected file/folder metadata |
| `SourceViewer` | Displays bounded, safely rendered source text |
| `DependencyPanel` | Lists inbound/outbound edges |
| `ToastRegion` | Reports recoverable actions and errors |
| `EmptyState` | Explains what to do when no data is available |
| `ErrorState` | Presents safe, actionable failure messages |
| `AccessibleSceneFallback` | Provides list/tree-based navigation |

## 5. Interaction states

Every asynchronous feature should represent:
- Idle
- Loading
- Success
- Empty
- Recoverable error
- Permission error
- Rate-limited or retry-later
- Stale revision
- Unsupported or truncated data

Buttons must have visible disabled and focus states. Avoid actions that only work on hover. Keep labels descriptive and ensure keyboard access.

## 6. Source viewer requirements

- Render source as text, never as executable HTML.
- Apply syntax highlighting only after safely escaping source.
- Display the file path and commit SHA.
- Mark truncated content explicitly.
- Provide copy/open-file actions only when their behavior is clear.
- Do not claim a dependency or symbol reference is complete when analysis is partial.

## 7. Responsive behavior

- Desktop: 3D canvas with optional side panels.
- Tablet: collapsible inspector and search panels.
- Mobile: prioritize repository/file list and source inspector; make 3D optional rather than forcing tiny controls.
- Respect reduced-motion settings and offer a non-animated focus option.

## 8. Acceptance criteria

- All major UI states have designs and implementation coverage.
- Core flows work with keyboard and pointer.
- 3D and 2D navigation expose the same basic file selection.
- Source content is safely rendered.
- Small screens retain a usable way to browse repository structure.
