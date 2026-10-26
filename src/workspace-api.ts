import type { WorkspaceChange } from './change-api.js';

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

export async function synchronizeWorkspace(workspaceId: string, operation: 'fetch' | 'pull' | 'push'): Promise<GitWorkspace> {
  const response = await fetch(`/api/v1/workspaces/${encodeURIComponent(workspaceId)}/operations`, {
    method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ operation }),
  });
  const value = await response.json().catch(() => null) as { error?: { message?: string } } | GitWorkspace | null;
  if (!response.ok) throw new Error(value && 'error' in value ? value.error?.message ?? `${operation} failed.` : `${operation} failed.`);
  if (!value || !('id' in value) || typeof value.id !== 'string' || value.operation !== 'idle') throw new Error('Synchronization response was not confirmed.');
  return value;
}

export interface ConflictSnapshot extends GitWorkspace { conflict: { paths: string[]; operation: 'merge' | 'unsupported' | 'none' } }

export async function getWorkspaceConflicts(workspaceId: string): Promise<ConflictSnapshot> {
  const response = await fetch(`/api/v1/workspaces/${encodeURIComponent(workspaceId)}/conflicts`, { credentials: 'same-origin', cache: 'no-store' });
  const value = await response.json().catch(() => null) as { error?: { message?: string } } | ConflictSnapshot | null;
  if (!response.ok) throw new Error(value && 'error' in value ? value.error?.message ?? 'Conflict state unavailable.' : 'Conflict state unavailable.');
  if (!value || !('id' in value) || !value.conflict) throw new Error('Conflict response was invalid.');
  return value;
}

export async function recoverWorkspaceConflict(workspaceId: string, operation: 'abort' | 'continue'): Promise<ConflictSnapshot> {
  const response = await fetch(`/api/v1/workspaces/${encodeURIComponent(workspaceId)}/conflicts`, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ operation }) });
  const value = await response.json().catch(() => null) as { error?: { message?: string } } | ConflictSnapshot | null;
  if (!response.ok) throw new Error(value && 'error' in value ? value.error?.message ?? `Conflict ${operation} failed.` : `Conflict ${operation} failed.`);
  if (!value || !('id' in value) || !value.conflict) throw new Error('Conflict response was invalid.');
  return value;
}

export interface WorkspaceCommit { sha: string; author: { name: string; email: string }; date: string; message: string; paths: Array<{ status: string; path: string; oldPath?: string }> }
export interface WorkspaceHistory { items: WorkspaceCommit[]; nextCursor: string | null }
export interface WorkspaceComparison { from: string; to: string; paths: Array<{ status: string; path: string }> }

async function workspaceRead<T>(path: string, errorMessage: string): Promise<T> {
  const response = await fetch(path, { credentials: 'same-origin', cache: 'no-store' });
  const value = await response.json().catch(() => null) as { error?: { message?: string } } | T | null;
  if (!response.ok) throw new Error(value && typeof value === 'object' && 'error' in value ? value.error?.message ?? errorMessage : errorMessage);
  if (!value) throw new Error(`${errorMessage} response was empty.`);
  return value as T;
}

export const getWorkspaceHistory = (workspaceId: string, cursor = '0', limit = 20) => workspaceRead<WorkspaceHistory>(`/api/v1/workspaces/${encodeURIComponent(workspaceId)}/history?cursor=${encodeURIComponent(cursor)}&limit=${limit}`, 'History unavailable.');
export const compareWorkspaceRevisions = (workspaceId: string, from: string, to: string) => workspaceRead<WorkspaceComparison>(`/api/v1/workspaces/${encodeURIComponent(workspaceId)}/compare?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, 'Revision comparison unavailable.');

export interface WorkspaceCommitResult extends GitWorkspace {
  commit: { sha: string; message: string; authorName: string; authorEmail: string };
  changes: WorkspaceChange[];
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
