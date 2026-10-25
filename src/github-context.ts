export function repositoryUrl(owner: string, repo: string): string {
  return `https://github.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
}

export function branchUrl(owner: string, repo: string, branch: string): string {
  return `${repositoryUrl(owner, repo)}/tree/${branch.split('/').map(encodeURIComponent).join('/')}`;
}

export function commitUrl(owner: string, repo: string, sha: string): string {
  return `${repositoryUrl(owner, repo)}/commit/${encodeURIComponent(sha)}`;
}

export async function createWorkspacePullRequest(workspaceId: string, owner: string, repo: string, base: string, title: string, body: string): Promise<{ existing: boolean; url: string; number: number }> {
  const response = await fetch(`/api/v1/repositories/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pull-requests`, {
    method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ workspaceId, base, title, body }),
  });
  const value = await response.json().catch(() => null) as { error?: { message?: string } } | { existing: boolean; url: string; number: number } | null;
  if (!response.ok) throw new Error(value && 'error' in value ? value.error?.message ?? 'Pull request failed.' : 'Pull request failed.');
  if (!value || !('url' in value) || typeof value.url !== 'string') throw new Error('Pull request response was invalid.');
  return value;
}
