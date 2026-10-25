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
