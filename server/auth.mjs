import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

const API_ROOT = 'https://api.github.com';
const AUTHORIZE_URL = 'https://github.com/login/oauth/authorize';
const TOKEN_URL = 'https://github.com/login/oauth/access_token';
const SESSION_TTL = 24 * 60 * 60 * 1000;
const OAUTH_TTL = 10 * 60 * 1000;

function cookieValue(request, name) {
  return request.headers.cookie?.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1) ?? '';
}

function addCookie(response, value) {
  const current = response.getHeader('Set-Cookie');
  response.setHeader('Set-Cookie', [...(Array.isArray(current) ? current : current ? [current] : []), value]);
}

function equalSecret(left, right) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function isLocalHostname(hostname) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
}

function isAllowedWebOrigin(value) {
  try {
    const url = new URL(value);
    return (url.protocol === 'https:' || (url.protocol === 'http:' && isLocalHostname(url.hostname))) &&
      url.pathname === '/' && !url.search && !url.hash && !url.username && !url.password;
  } catch {
    return false;
  }
}

function isAllowedCallback(value) {
  try {
    const url = new URL(value);
    return (url.protocol === 'https:' || (url.protocol === 'http:' && isLocalHostname(url.hostname))) &&
      url.pathname === '/auth/github/callback' && !url.search && !url.hash && !url.username && !url.password;
  } catch {
    return false;
  }
}

export function createAuthService(env = process.env, requestFetch = fetch) {
  // shortcut: process-local sessions invalidate on restart and cannot span API instances; replace with shared storage before scaling.
  const sessions = new Map();
  const transactions = new Map();
  const cookieName = /^[A-Za-z0-9_-]+$/u.test(env.SESSION_COOKIE_NAME ?? '') ? env.SESSION_COOKIE_NAME : 'gh3d_session';
  const stateCookie = 'gh3d_oauth_state';
  const secure = env.NODE_ENV === 'production' || (env.WEB_ORIGIN ?? '').startsWith('https:');
  const callbackUrl = env.GITHUB_APP_CALLBACK_URL;
  const webOrigin = env.WEB_ORIGIN;
  const installUrl = /^[A-Za-z0-9-]+$/u.test(env.GITHUB_APP_SLUG ?? '')
    ? `https://github.com/apps/${env.GITHUB_APP_SLUG}/installations/new`
    : null;
  const configured = Boolean(env.GITHUB_APP_CLIENT_ID && env.GITHUB_APP_CLIENT_SECRET &&
    isAllowedCallback(callbackUrl) && isAllowedWebOrigin(webOrigin));

  const cookie = (name, value, maxAge, path = '/') =>
    `${name}=${value}; HttpOnly; SameSite=Lax; Path=${path}; Max-Age=${maxAge}${secure ? '; Secure' : ''}`;

  function sessionFor(request) {
    const id = cookieValue(request, cookieName);
    const session = sessions.get(id);
    if (!session) return null;
    if (session.expiresAt <= Date.now()) {
      sessions.delete(id);
      return null;
    }
    return { id, ...session };
  }

  async function start(response) {
    if (!configured) {
      const error = new Error('GitHub App sign-in is not configured.');
      error.status = 503;
      throw error;
    }
    for (const [key, transaction] of transactions) if (transaction.expiresAt <= Date.now()) transactions.delete(key);
    if (transactions.size >= 1000) {
      const error = new Error('Too many pending sign-in requests.');
      error.status = 503;
      throw error;
    }
    const state = randomBytes(32).toString('base64url');
    const verifier = randomBytes(32).toString('base64url');
    const challenge = createHash('sha256').update(verifier).digest('base64url');
    transactions.set(state, { verifier, expiresAt: Date.now() + OAUTH_TTL });
    addCookie(response, cookie(stateCookie, state, 600, '/auth/github/callback'));
    const url = new URL(AUTHORIZE_URL);
    url.searchParams.set('client_id', env.GITHUB_APP_CLIENT_ID);
    url.searchParams.set('redirect_uri', callbackUrl);
    url.searchParams.set('state', state);
    url.searchParams.set('code_challenge', challenge);
    url.searchParams.set('code_challenge_method', 'S256');
    url.searchParams.set('scope', 'offline_access');
    return url;
  }

  async function callback(request, response, url) {
    const state = url.searchParams.get('state') ?? '';
    const cookieState = cookieValue(request, stateCookie);
    const transaction = transactions.get(state);
    transactions.delete(state);
    addCookie(response, cookie(stateCookie, '', 0, '/auth/github/callback'));
    if (!state || !cookieState || !equalSecret(state, cookieState) || !transaction || transaction.expiresAt <= Date.now()) {
      const error = new Error('GitHub sign-in state validation failed. Restart sign-in.');
      error.status = 400;
      throw error;
    }
    if (url.searchParams.has('error')) return new URL('/?auth=denied', webOrigin);
    const code = url.searchParams.get('code');
    if (!code || code.length > 512) {
      const error = new Error('GitHub did not return an authorization code.');
      error.status = 400;
      throw error;
    }

    const tokenResponse = await requestFetch(TOKEN_URL, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: env.GITHUB_APP_CLIENT_ID,
        client_secret: env.GITHUB_APP_CLIENT_SECRET,
        code,
        redirect_uri: callbackUrl,
        code_verifier: transaction.verifier,
      }),
      signal: AbortSignal.timeout(15_000),
    });
    const token = await tokenResponse.json();
    if (!tokenResponse.ok || typeof token.access_token !== 'string' || token.access_token.length > 4096 ||
      typeof token.refresh_token !== 'string' || token.refresh_token.length > 4096) {
      const error = new Error('GitHub could not complete sign-in. Retry or check app configuration.');
      error.status = 502;
      throw error;
    }
    const userResponse = await requestFetch(`${API_ROOT}/user`, {
      headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token.access_token}`, 'User-Agent': 'github-3D', 'X-GitHub-Api-Version': '2026-03-10' },
      signal: AbortSignal.timeout(15_000),
    });
    const user = await userResponse.json();
    if (!userResponse.ok || typeof user.login !== 'string' || !user.login) {
      const error = new Error('GitHub could not verify the signed-in user.');
      error.status = 502;
      throw error;
    }

    const oldId = cookieValue(request, cookieName);
    if (oldId) sessions.delete(oldId);
    for (const [sessionId, session] of sessions) if (session.expiresAt <= Date.now()) sessions.delete(sessionId);
    if (sessions.size >= 10_000) {
      const error = new Error('Session capacity reached. Retry later.');
      error.status = 503;
      throw error;
    }
    const id = randomBytes(32).toString('base64url');
    const expiresIn = Number.isSafeInteger(token.expires_in) ? token.expires_in * 1000 : SESSION_TTL;
    sessions.set(id, {
      user: { login: user.login, avatarUrl: typeof user.avatar_url === 'string' ? user.avatar_url : '' },
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      accessExpiresAt: Date.now() + expiresIn,
      expiresAt: Date.now() + SESSION_TTL,
    });
    addCookie(response, cookie(cookieName, id, Math.floor(SESSION_TTL / 1000)));
    return new URL('/', webOrigin);
  }

  async function validAccessToken(session) {
    if (session.accessExpiresAt > Date.now() + 30_000) return session.accessToken;
    const tokenResponse = await requestFetch(TOKEN_URL, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: env.GITHUB_APP_CLIENT_ID,
        client_secret: env.GITHUB_APP_CLIENT_SECRET,
        grant_type: 'refresh_token',
        refresh_token: session.refreshToken,
      }),
      signal: AbortSignal.timeout(15_000),
    });
    const token = await tokenResponse.json();
    if (!tokenResponse.ok || typeof token.access_token !== 'string' || token.access_token.length > 4096 ||
      typeof token.refresh_token !== 'string' || token.refresh_token.length > 4096) {
      sessions.delete(session.id);
      const error = new Error('GitHub session expired. Sign in again.');
      error.status = 401;
      throw error;
    }
    const stored = sessions.get(session.id);
    if (!stored) {
      const error = new Error('GitHub session expired. Sign in again.');
      error.status = 401;
      throw error;
    }
    const expiresIn = Number.isSafeInteger(token.expires_in) ? token.expires_in * 1000 : SESSION_TTL;
    stored.accessToken = token.access_token;
    stored.refreshToken = token.refresh_token;
    stored.accessExpiresAt = Date.now() + expiresIn;
    return stored.accessToken;
  }

  async function listRepositories(session, cursor) {
    const page = cursor === undefined ? 1 : Number(cursor);
    if (!Number.isInteger(page) || page < 1 || page > 100) {
      const error = new Error('Invalid repository-list cursor.');
      error.status = 400;
      throw error;
    }
    const accessToken = await validAccessToken(session);
    const url = new URL(`${API_ROOT}/user/repos`);
    url.searchParams.set('visibility', 'all');
    url.searchParams.set('affiliation', 'owner,collaborator,organization_member');
    url.searchParams.set('sort', 'updated');
    url.searchParams.set('per_page', '100');
    url.searchParams.set('page', String(page));
    const upstream = await requestFetch(url, {
      headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${accessToken}`, 'User-Agent': 'github-3D', 'X-GitHub-Api-Version': '2026-03-10' },
      signal: AbortSignal.timeout(15_000),
    });
    if (upstream.status === 401) {
      sessions.delete(session.id);
      const error = new Error('GitHub authorization expired. Sign in again.');
      error.status = 401;
      throw error;
    }
    if (!upstream.ok) {
      const error = new Error(upstream.status === 403 ? 'GitHub repository access was denied.' : 'Could not list GitHub repositories.');
      error.status = upstream.status === 403 ? 403 : 502;
      throw error;
    }
    const repositories = await upstream.json();
    if (!Array.isArray(repositories)) throw new Error('GitHub returned an invalid repository list.');
    return {
      items: repositories.map((repository) => ({
        id: String(repository.id),
        owner: repository.owner.login,
        name: repository.name,
        fullName: repository.full_name,
        defaultBranch: repository.default_branch,
        private: Boolean(repository.private),
        updatedAt: repository.updated_at,
      })),
      nextCursor: repositories.length === 100 && page < 100 ? String(page + 1) : null,
    };
  }

  function logout(request, response) {
    const id = cookieValue(request, cookieName);
    if (id) sessions.delete(id);
    addCookie(response, cookie(cookieName, '', 0));
  }

  function invalidate(session) {
    sessions.delete(session.id);
  }

  return {
    configured,
    installUrl,
    start,
    callback,
    sessionFor,
    listRepositories,
    accessTokenFor: validAccessToken,
    invalidate,
    logout,
    publicSession: (session) => ({ authenticated: Boolean(session), user: session?.user ?? null }),
  };
}
