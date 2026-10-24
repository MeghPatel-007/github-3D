# 06 — Code Analysis and Dependencies

## 1. Scope

The first analysis release should support a limited, explicitly documented set of JavaScript/TypeScript-family imports. Accurate results are more important than claiming broad language support.

## 2. Analysis pipeline

1. Select source files with supported extensions.
2. Enforce file-size and total-analysis limits.
3. Parse source using an AST-capable parser.
4. Extract import/export-from statements and supported dynamic imports.
5. Resolve relative paths and known extensions/index-file rules.
6. Resolve configured path aliases only when the relevant configuration is available and understood.
7. Record resolved and unresolved edges.
8. Cache results by commit SHA, analyzer version, and configuration.
9. Render edges and expose their source information in the UI.

Do not execute repository code to resolve imports.

## 3. Dependency model

A dependency edge is directed from the importing file to the imported file.

Minimum fields:
- Edge ID
- Source file ID
- Target file ID, nullable when unresolved
- Relationship kind
- Resolution status
- Original import specifier
- Source line when available
- Unresolved reason when available

## 4. Resolution rules

- Resolve relative imports against the importing file's directory.
- Apply only documented extension and index-file resolution rules.
- Use `tsconfig`/bundler aliases only if the parser understands the applicable configuration.
- Do not claim that a package import points to a local file unless resolution proves it.
- Distinguish external package imports from local repository edges.
- Respect case-sensitive paths.
- Preserve unresolved imports for inspection without drawing a false connection.

## 5. Visualization rules

- Incoming edges represent files importing the selected file.
- Outgoing edges represent imports made by the selected file.
- Use directed indicators where readable.
- Use distinct styles for import edges and directory containment.
- Allow incoming/outgoing/both/none filters.
- Keep the legend visible or easily discoverable.
- Selecting an edge shows the source path, target/specifier, and line when available.

## 6. Symbol and function tracing — later release

Function tracing is more complex than import analysis. A matching identifier name does not prove symbol identity. Scope, exports, re-exports, aliases, overloads, dynamic imports, reflection, and language semantics can make static analysis ambiguous.

For a later release:
- Parse supported languages into syntax trees.
- Index function, method, class, and export declarations.
- Resolve references using language-aware analysis or LSP-compatible tooling where feasible.
- Store definition and reference locations with line/column.
- Mark unresolved or ambiguous references explicitly.
- Let the user jump to source locations.
- Avoid labeling a static reference as a runtime call unless that claim is actually supported.

## 7. Limits and UX

The analyzer must have:
- Maximum file size.
- Maximum total bytes or files analyzed per operation.
- Cancellation support.
- Bounded concurrency.
- Progress feedback for long analysis.
- Clear unsupported-language and parse-error states.
- A way to disable edges if they clutter the scene.

A failed analysis must not block repository browsing.

## 8. Acceptance criteria

- Known local imports in fixtures resolve to expected files.
- Missing imports remain unresolved.
- Aliases resolve only when configured and supported.
- Parse failures do not crash the application.
- Edge source and target IDs correspond to the active revision.
- The UI does not invent runtime semantics.
- Analyzer cache invalidates when revision, configuration, or analyzer version changes.
