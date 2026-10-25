# 04 — Repository Data and GitHub API

## 1. Revision consistency

Every repository load must resolve a concrete commit SHA. Store that SHA on the active repository model. Use it for tree retrieval, file content, dependency analysis, and historical comparison.

A branch name is mutable; a commit SHA identifies the revision being explored. If the branch advances, the current scene should remain bound to its loaded SHA until the user refreshes or explicitly switches revision.

## 2. GitHub API capabilities

Use current GitHub REST API documentation when implementing and validating endpoints.

Typical capabilities:
- Repository metadata: `GET /repos/{owner}/{repo}`
- Git tree: `GET /repos/{owner}/{repo}/git/trees/{tree_sha}?recursive=1`
- Contents: `GET /repos/{owner}/{repo}/contents/{path}`
- Commit list: `GET /repos/{owner}/{repo}/commits`
- Commit detail and changed files: `GET /repos/{owner}/{repo}/commits/{ref}`

Exact endpoint behavior, response fields, pagination, and permissions must be verified against current GitHub documentation.

## 3. Loading sequence

1. Validate the repository identifier.
2. Fetch repository metadata.
3. Resolve the selected branch or ref to a commit SHA.
4. Fetch the tree for the resolved SHA.
5. Detect truncation.
6. If truncated, fetch subtrees selectively or report limits and provide a partial-navigation state.
7. Normalize tree entries into the application model.
8. Compute layout inputs.
9. Analyze supported source files either on demand or through a bounded analysis task.
10. Fetch source content only when the user selects a file.

Do not download all source files during initial import.

## 4. Data model

```ts
type NodeType = "repository" | "directory" | "file";

interface RepositoryNode {
  id: string;
  name: string;
  path: string;
  type: NodeType;
  parentId: string | null;
  childrenIds: string[];
  extension?: string;
  size?: number;
  sha?: string;
  language?: string;
}

interface DependencyEdge {
  id: string;
  sourceId: string;
  targetId: string | null;
  kind: "import" | "reference";
  status: "resolved" | "unresolved";
  specifier?: string;
  line?: number;
  reason?: string;
}

interface RepositoryModel {
  owner: string;
  name: string;
  defaultBranch: string;
  commitSha: string;
  nodes: Record<string, RepositoryNode>;
  dependencies: DependencyEdge[];
}
```

The model above is the conceptual contract. Refine it as implementation reveals exact API fields and analysis requirements.

## 5. Identifier and path rules

- Use repository-relative POSIX-style paths internally.
- Preserve case; do not assume all filesystems are case-insensitive.
- Distinguish files and directories even if names match.
- Use a revision-aware node identity, or include repository and commit SHA in cache keys.
- Keep scene coordinates in a separate layout map keyed by node ID.
- Handle root files, dotfiles, extensionless files, and nested directories.
- Do not treat symbolic links or submodules as ordinary directories without checking the tree entry type.

## 6. Caching

Suggested cache layers:
- Repository metadata: short-lived cache.
- Tree: keyed by owner, repo, and commit SHA.
- File content: keyed by owner, repo, path, and commit SHA.
- Dependency analysis: keyed by commit SHA, analyzer version, configuration, and supported-language set.
- Layout: keyed by model revision, layout algorithm version, and layout settings.

Private data cache keys must include the authorization boundary or use per-session isolation. Do not share private source data across users without a deliberate secure design.

## 7. Rate limits and retries

- Read GitHub rate-limit response headers where available.
- Avoid repeated requests for the same tree and content.
- Use bounded concurrency for content/analysis tasks.
- Retry transient failures with backoff.
- Do not retry invalid requests indefinitely.
- Surface rate limits with an actionable message.
- Support cancellation when a user switches repositories.
- Ignore stale responses from a previous repository or revision.

## 8. Content safety and size limits

- Fetch file content on selection.
- Set a configurable maximum source size for inline inspection.
- Detect binary or unsupported content.
- Render source as escaped text through a syntax highlighter.
- Do not execute code, HTML, package scripts, or repository-provided build steps.
- Show a GitHub link for oversized or unsupported files.

## 9. Import errors

Normalize errors into user-facing categories:
- Invalid repository URL
- Repository not found or inaccessible
- Insufficient permissions
- Rate limit reached
- Network timeout
- Tree truncated or partially available
- File too large
- Unsupported/binary file
- Revision no longer available
- Unexpected service error

Error messages must not expose tokens, raw stack traces, or private information.

## 10. Managed Git workspace model

The Git workspace is server-managed, isolated per user and repository, and accessed through typed application operations. It is distinct from the revision-scoped GitHub repository model:

```ts
interface GitWorkspace {
  id: string;
  repository: { owner: string; name: string };
  remoteUrl: string;
  defaultBranch: string;
  currentBranch: string;
  headSha: string | null;
  upstreamSha: string | null;
  workingTree: "clean" | "modified" | "conflicted";
  stagedCount: number;
  unstagedCount: number;
  sync: { ahead: number; behind: number };
  operation: "idle" | "cloning" | "fetching" | "pulling" | "pushing" | "conflict";
}
```

Lifecycle: create or resume a workspace, clone or open its remote, inspect actual Git state, perform one typed operation at a time, reconcile state after interruption, and explicitly close or delete it. Switching repositories must keep each workspace's uncommitted state visible and must not silently discard it. The workspace service owns Git objects, index, working tree, progress, cancellation boundaries, and conflict state; the 3D and 2D clients consume snapshots and diffs.

The web client requires network access for workspace operations. It does not promise offline commits or access to an arbitrary local desktop directory. Durable retention, deletion, storage quotas, and backup policy are deployment requirements before private workspaces are enabled broadly.
