export interface GitWorkspace {
  id: string;
  repository: { owner: string; name: string };
  remoteUrl: string;
  defaultBranch: string;
  currentBranch: string;
  headSha: string | null;
  upstreamSha: string | null;
  workingTree: 'clean' | 'modified' | 'conflicted';
  stagedCount: number;
  unstagedCount: number;
  sync: { ahead: number; behind: number };
  operation: 'idle' | 'cloning' | 'fetching' | 'pulling' | 'pushing' | 'conflict';
  branches?: GitBranch[];
}

export interface GitBranch {
  name: string;
  kind: 'local' | 'remote';
  upstream: string | null;
  current: boolean;
}

export async function openWorkspace(owner: string, repo: string, action: 'init' | 'open' | 'clone' = 'open'): Promise<GitWorkspace> {
  const response = await fetch('/api/v1/workspaces', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ owner, repo, action }),
  });
  const value = await response.json().catch(() => null) as { error?: { message?: string } } | GitWorkspace | null;
  if (!response.ok) throw new Error(value && 'error' in value ? value.error?.message ?? 'Workspace operation failed.' : 'Workspace operation failed.');
  if (!value || !('id' in value) || typeof value.id !== 'string') throw new Error('Workspace response was invalid.');
  return value;
}

export async function getWorkspace(workspaceId: string): Promise<GitWorkspace> {
  const response = await fetch(`/api/v1/workspaces/${encodeURIComponent(workspaceId)}`, { credentials: 'same-origin', cache: 'no-store' });
  const value = await response.json().catch(() => null) as { error?: { message?: string } } | GitWorkspace | null;
  if (!response.ok) throw new Error(value && 'error' in value ? value.error?.message ?? 'Workspace request failed.' : 'Workspace request failed.');
  if (!value || !('id' in value) || typeof value.id !== 'string') throw new Error('Workspace response was invalid.');
  return value;
}

export interface WorkspaceCommitResult extends GitWorkspace {
  commit: { sha: string; message: string; authorName: string; authorEmail: string };
  changes: Array<{ path: string; kind: string; staged: boolean; unstaged: boolean }>;
}

export async function commitWorkspace(workspaceId: string, message: string, authorName: string, authorEmail: string): Promise<WorkspaceCommitResult> {
  const response = await fetch(`/api/v1/workspaces/${encodeURIComponent(workspaceId)}/commit`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, authorName, authorEmail }),
  });
  const value = await response.json().catch(() => null) as { error?: { message?: string } } | WorkspaceCommitResult | null;
  if (!response.ok) throw new Error(value && 'error' in value ? value.error?.message ?? 'Commit failed.' : 'Commit failed.');
  const commit = value && 'commit' in value && value.commit && typeof value.commit === 'object' ? value.commit : null;
  if (!value || !('id' in value) || typeof value.id !== 'string' || !commit || typeof (commit as { sha?: unknown }).sha !== 'string') throw new Error('Commit response was invalid.');
  return value;
}

async function branchRequest(workspaceId: string, method: string, path: string, body?: object): Promise<GitWorkspace> {
  const response = await fetch(`/api/v1/workspaces/${encodeURIComponent(workspaceId)}/branches${path}`, {
    method,
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const value = await response.json().catch(() => null) as { error?: { message?: string } } | GitWorkspace | null;
  if (!response.ok) throw new Error(value && 'error' in value ? value.error?.message ?? 'Branch operation failed.' : 'Branch operation failed.');
  if (!value || !('id' in value) || typeof value.id !== 'string' || !Array.isArray(value.branches)) throw new Error('Branch response was invalid.');
  return value;
}

export const getBranches = (workspaceId: string) => branchRequest(workspaceId, 'GET', '');
export const createBranch = (workspaceId: string, name: string, startPoint?: string) => branchRequest(workspaceId, 'POST', '', { operation: 'create', name, startPoint });
export const checkoutBranch = (workspaceId: string, name: string) => branchRequest(workspaceId, 'POST', '', { operation: 'checkout', name });
export const renameBranch = (workspaceId: string, name: string, newName: string) => branchRequest(workspaceId, 'PATCH', `/${encodeURIComponent(name)}`, { operation: 'rename', name, newName });
export const deleteBranch = (workspaceId: string, name: string) => branchRequest(workspaceId, 'DELETE', `/${encodeURIComponent(name)}`, { operation: 'delete', name });
