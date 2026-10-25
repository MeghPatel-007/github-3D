export interface SessionUser {
  login: string;
  avatarUrl: string;
}

export interface SessionState {
  authenticated: boolean;
  user: SessionUser | null;
}

export interface AccessibleRepository {
  id: string;
  owner: string;
  name: string;
  fullName: string;
  defaultBranch: string;
  private: boolean;
}

export class AuthApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'AuthApiError';
  }
}

export async function getSession(): Promise<SessionState> {
  const response = await fetch('/api/v1/session', { credentials: 'same-origin', cache: 'no-store' });
  if (!response.ok) throw new Error('Could not read sign-in status.');
  const value: unknown = await response.json();
  if (value == null || typeof value !== 'object') throw new Error('Sign-in status response was invalid.');
  const result = value as SessionState;
  if (typeof result.authenticated !== 'boolean' || result.authenticated !== (result.user !== null) || (result.user !== null &&
    (result.user == null || typeof result.user.login !== 'string' || typeof result.user.avatarUrl !== 'string'))) {
    throw new Error('Sign-in status response was invalid.');
  }
  return result;
}

export async function getAuthConfig(): Promise<{ configured: boolean; installUrl: string | null }> {
  const response = await fetch('/api/v1/auth-config', { cache: 'no-store' });
  if (!response.ok) throw new Error('Could not read GitHub sign-in configuration.');
  const value: unknown = await response.json();
  if (value == null || typeof value !== 'object') throw new Error('GitHub sign-in configuration response was invalid.');
  const result = value as { configured: boolean; installUrl: string | null };
  if (typeof result.configured !== 'boolean' || (result.installUrl !== null &&
    (typeof result.installUrl !== 'string' || !/^https:\/\/github\.com\/apps\/[A-Za-z0-9-]+\/installations\/new$/u.test(result.installUrl)))) {
    throw new Error('GitHub sign-in configuration response was invalid.');
  }
  return result;
}

export async function listRepositories(cursor?: string, search = ''): Promise<{ items: AccessibleRepository[]; nextCursor: string | null }> {
  const params = new URLSearchParams();
  if (cursor) params.set('cursor', cursor);
  if (search.trim()) params.set('q', search.trim());
  const query = params.toString() ? `?${params.toString()}` : '';
  const response = await fetch(`/api/v1/repositories${query}`, { credentials: 'same-origin', cache: 'no-store' });
  const value: unknown = await response.json().catch(() => null);
  const body = value != null && typeof value === 'object' ? value as { items?: AccessibleRepository[]; nextCursor?: string | null; error?: { message?: string } } : {};
  if (!response.ok) throw new AuthApiError(body.error?.message ?? 'Could not list repositories.', response.status);
  if (!Array.isArray(body.items) || body.items.some((repository) =>
    typeof repository.id !== 'string' || typeof repository.owner !== 'string' || typeof repository.name !== 'string' ||
    typeof repository.fullName !== 'string' || typeof repository.defaultBranch !== 'string' || typeof repository.private !== 'boolean')) {
    throw new AuthApiError(body.error?.message ?? 'Repository list response was invalid.', response.status);
  }
  if (body.nextCursor !== null && body.nextCursor !== undefined && typeof body.nextCursor !== 'string') {
    throw new AuthApiError('Repository list response was invalid.', response.status);
  }
  return { items: body.items, nextCursor: body.nextCursor ?? null };
}

export function beginGitHubSignIn(): void {
  window.location.assign('/auth/github');
}

export async function signOut(): Promise<void> {
  const response = await fetch('/api/v1/logout', { method: 'POST', credentials: 'same-origin' });
  if (!response.ok) throw new Error('Could not sign out.');
}
