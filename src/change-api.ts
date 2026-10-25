export type ChangeKind = 'untracked' | 'added' | 'modified' | 'renamed' | 'deleted';

export interface WorkspaceChange {
  path: string;
  kind: ChangeKind;
  oldPath?: string;
  staged: boolean;
  unstaged: boolean;
}

export interface WorkspaceDiff {
  path: string;
  oldPath?: string;
  staged: boolean;
  binary: boolean;
  unsupported: boolean;
  truncated: boolean;
  patch: string;
}

export async function getWorkspaceChanges(workspaceId: string): Promise<{ changes: WorkspaceChange[] }> {
  const response = await fetch(`/api/v1/workspaces/${encodeURIComponent(workspaceId)}/changes`, { credentials: 'same-origin', cache: 'no-store' });
  const value = await response.json().catch(() => null) as { changes?: WorkspaceChange[]; error?: { message?: string } } | null;
  if (!response.ok || !value || !Array.isArray(value.changes)) throw new Error(value?.error?.message ?? 'Could not read workspace changes.');
  return { changes: value.changes };
}

export async function getWorkspaceDiff(workspaceId: string, path: string, staged: boolean): Promise<WorkspaceDiff> {
  const params = new URLSearchParams({ path, staged: String(staged) });
  const response = await fetch(`/api/v1/workspaces/${encodeURIComponent(workspaceId)}/changes/diff?${params}`, { credentials: 'same-origin', cache: 'no-store' });
  const value = await response.json().catch(() => null) as WorkspaceDiff & { error?: { message?: string } } | null;
  if (!response.ok || !value || typeof value.patch !== 'string') throw new Error(value?.error?.message ?? 'Could not read workspace diff.');
  return value;
}

export type ChangeOperation = 'stage' | 'unstage' | 'discard';

export async function mutateWorkspaceChanges(workspaceId: string, operation: ChangeOperation, paths: string[], confirmPaths?: string[]): Promise<{ changes: WorkspaceChange[] }> {
  const response = await fetch(`/api/v1/workspaces/${encodeURIComponent(workspaceId)}/changes/actions`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ operation, paths, confirmPaths }),
  });
  const value = await response.json().catch(() => null) as { changes?: WorkspaceChange[]; error?: { message?: string } } | null;
  if (!response.ok || !value || !Array.isArray(value.changes)) throw new Error(value?.error?.message ?? 'Git change operation failed.');
  return { changes: value.changes };
}
