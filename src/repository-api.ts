export interface ImportedRepository {
  owner: string;
  name: string;
  private: boolean;
  defaultBranch: string;
  ref: string;
  commitSha: string;
  truncated: boolean;
  unsupportedCount: number;
  entries: { path: string; type: 'blob' | 'tree'; size?: number }[];
}

export class RepositoryApiError extends Error {
  readonly status: number;

  constructor(message: string, status = 0) {
    super(message);
    this.name = 'RepositoryApiError';
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { ...init, headers: { 'Content-Type': 'application/json', ...init?.headers } });
  const body = await response.json().catch(() => null) as { error?: { message?: string } } | null;
  if (!response.ok) throw new RepositoryApiError(body?.error?.message ?? `Repository request failed (${response.status}).`, response.status);
  return body as T;
}

export function parseGitHubRepositoryUrl(value: string): { owner: string; repo: string } | null {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:' || url.hostname.toLowerCase() !== 'github.com' || url.username || url.password || url.search || url.hash) return null;
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts.length !== 2 || !/^[\w.-]+$/u.test(parts[0]) || !/^[\w.-]+$/u.test(parts[1])) return null;
    const repo = parts[1].replace(/\.git$/iu, '');
    return repo ? { owner: parts[0], repo } : null;
  } catch {
    return null;
  }
}

export function importPublicRepository(owner: string, repo: string, ref?: string, signal?: AbortSignal): Promise<ImportedRepository> {
  return request<unknown>('/api/v1/repositories/import', {
    method: 'POST',
    signal,
    body: JSON.stringify({ owner, repo, ...(ref ? { ref } : {}) }),
  }).then((value) => {
    if (value == null || typeof value !== 'object') throw new RepositoryApiError('Repository response was invalid.');
    const result = value as ImportedRepository;
    if (typeof result.owner !== 'string' || typeof result.name !== 'string' || typeof result.private !== 'boolean' || typeof result.defaultBranch !== 'string' ||
      typeof result.ref !== 'string' || !/^[a-f0-9]{40}$/iu.test(result.commitSha) || !Array.isArray(result.entries) ||
      typeof result.truncated !== 'boolean' || !Number.isSafeInteger(result.unsupportedCount) || result.unsupportedCount < 0 ||
      result.entries.length > 10_000 || result.entries.some((entry) =>
        typeof entry.path !== 'string' || entry.path.length > 1024 || entry.path.startsWith('/') || entry.path.includes('\\') ||
        entry.path.split('/').some((part) => !part || part === '.' || part === '..') ||
        (entry.type !== 'blob' && entry.type !== 'tree') || (entry.size !== undefined && (!Number.isSafeInteger(entry.size) || entry.size < 0)))) {
      throw new RepositoryApiError('Repository response was invalid.');
    }
    return result;
  });
}

export function fetchRepositoryFile(owner: string, repo: string, path: string, commitSha: string, signal?: AbortSignal): Promise<{ path: string; commitSha: string; content: string; truncated: boolean }> {
  return request<unknown>(`/api/v1/repositories/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents?path=${encodeURIComponent(path)}&sha=${encodeURIComponent(commitSha)}`, { signal }).then((value) => {
    if (value == null || typeof value !== 'object') throw new RepositoryApiError('File response was invalid.');
    const result = value as { path: string; commitSha: string; content: string; truncated: boolean };
    if (result.path !== path || result.commitSha !== commitSha || typeof result.content !== 'string' || typeof result.truncated !== 'boolean') {
      throw new RepositoryApiError('File response did not match the active revision.');
    }
    return result;
  });
}
