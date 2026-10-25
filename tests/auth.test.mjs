import assert from 'node:assert/strict';
import test from 'node:test';
import { createAuthService } from '../server/auth.mjs';

function responseRecorder() {
  const headers = new Map();
  return { headers, setHeader: (name, value) => headers.set(name, value), getHeader: (name) => headers.get(name) };
}

const env = {
  GITHUB_APP_CLIENT_ID: 'client-id',
  GITHUB_APP_CLIENT_SECRET: 'server-only-secret',
  GITHUB_APP_CALLBACK_URL: 'https://localhost:8081/auth/github/callback',
  GITHUB_APP_SLUG: 'github-3d',
  WEB_ORIGIN: 'https://localhost:8081',
};

test('GitHub App web flow uses state and PKCE, then stores tokens only in server session', async () => {
  const requests = [];
  const fakeFetch = async (url, init) => {
    requests.push({ url: String(url), init });
    if (requests.length === 1) return Response.json({ access_token: 'access-secret', refresh_token: 'refresh-secret', expires_in: 28800 });
    if (requests.length === 2) return Response.json({ login: 'octocat', avatar_url: 'https://avatars.githubusercontent.com/u/1' });
    return Response.json([{ id: 7, owner: { login: 'octocat' }, name: 'private-demo', full_name: 'octocat/private-demo', default_branch: 'main', private: true, updated_at: '2026-01-01T00:00:00Z' }]);
  };
  const auth = createAuthService(env, fakeFetch);
  const startResponse = responseRecorder();
  const authorizeUrl = await auth.start(startResponse);
  const state = authorizeUrl.searchParams.get('state');
  assert.equal(authorizeUrl.searchParams.get('code_challenge_method'), 'S256');
  assert.equal(authorizeUrl.searchParams.get('code_challenge').length, 43);
  assert.equal(authorizeUrl.searchParams.get('scope'), 'offline_access');
  assert.equal(authorizeUrl.searchParams.has('client_secret'), false);
  assert.ok(String(startResponse.headers.get('Set-Cookie')).includes('HttpOnly'));
  assert.ok(String(startResponse.headers.get('Set-Cookie')).includes('SameSite=Lax'));
  assert.ok(String(startResponse.headers.get('Set-Cookie')).includes('Secure'));

  const callbackResponse = responseRecorder();
  const redirect = await auth.callback(
    { headers: { cookie: `gh3d_oauth_state=${state}` } },
    callbackResponse,
    new URL(`https://localhost:8081/auth/github/callback?state=${state}&code=one-time-code`),
  );
  assert.equal(redirect.href, 'https://localhost:8081/');
  assert.match(String(requests[0].init.body), /code_verifier=/u);
  assert.equal(requests[0].init.body.toString().includes('server-only-secret'), true);

  const sessionCookie = callbackResponse.headers.get('Set-Cookie').find((value) => value.startsWith('gh3d_session='));
  assert.equal(sessionCookie.includes('access-secret'), false);
  assert.equal(sessionCookie.includes('refresh-secret'), false);
  const sessionId = sessionCookie.match(/^gh3d_session=([^;]+)/u)[1];
  const request = { headers: { cookie: `gh3d_session=${sessionId}` } };
  const session = auth.sessionFor(request);
  assert.deepEqual(auth.publicSession(session), {
    authenticated: true,
    user: { login: 'octocat', avatarUrl: 'https://avatars.githubusercontent.com/u/1' },
  });
  const repositories = await auth.listRepositories(session);
  assert.equal(repositories.items[0].private, true);
  assert.equal(repositories.items[0].fullName, 'octocat/private-demo');
  assert.equal(requests[2].init.headers.Authorization, 'Bearer access-secret');
  auth.logout(request, callbackResponse);
  assert.equal(auth.sessionFor(request), null);
});

test('OAuth callback rejects mismatched state before exchanging code', async () => {
  let requests = 0;
  const auth = createAuthService(env, async () => { requests += 1; return Response.json({}); });
  const started = responseRecorder();
  const authorizeUrl = await auth.start(started);
  const state = authorizeUrl.searchParams.get('state');
  await assert.rejects(
    auth.callback({ headers: { cookie: 'gh3d_oauth_state=wrong' } }, responseRecorder(), new URL(`https://localhost:8081/auth/github/callback?state=${state}&code=abc`)),
    { status: 400 },
  );
  assert.equal(requests, 0);
});

test('OAuth denial clears the transaction and returns a safe retry redirect', async () => {
  let requests = 0;
  const auth = createAuthService(env, async () => { requests += 1; return Response.json({}); });
  const started = responseRecorder();
  const authorizeUrl = await auth.start(started);
  const state = authorizeUrl.searchParams.get('state');
  const callbackResponse = responseRecorder();
  const redirect = await auth.callback(
    { headers: { cookie: `gh3d_oauth_state=${state}` } },
    callbackResponse,
    new URL(`https://localhost:8081/auth/github/callback?state=${state}&error=access_denied`),
  );
  assert.equal(redirect.href, 'https://localhost:8081/?auth=denied');
  assert.equal(requests, 0);
  assert.ok(callbackResponse.headers.get('Set-Cookie').some((value) => value.startsWith('gh3d_oauth_state=;')));
  await assert.rejects(
    auth.callback(
      { headers: { cookie: `gh3d_oauth_state=${state}` } },
      responseRecorder(),
      new URL(`https://localhost:8081/auth/github/callback?state=${state}&code=retry`),
    ),
    { status: 400 },
  );
});

test('auth remains disabled without GitHub App credentials', async () => {
  const auth = createAuthService({});
  assert.equal(auth.configured, false);
  await assert.rejects(auth.start(responseRecorder()), { status: 503 });
});

test('expired GitHub access token refreshes before listing repositories', async () => {
  const requests = [];
  const fakeFetch = async (url, init) => {
    requests.push({ url: String(url), init });
    if (requests.length === 1) return Response.json({ access_token: 'old-access', refresh_token: 'old-refresh', expires_in: 0 });
    if (requests.length === 2) return Response.json({ login: 'octocat' });
    if (requests.length === 3) return Response.json({ access_token: 'new-access', refresh_token: 'new-refresh', expires_in: 3600 });
    return Response.json([]);
  };
  const auth = createAuthService(env, fakeFetch);
  const started = responseRecorder();
  const authorizeUrl = await auth.start(started);
  const state = authorizeUrl.searchParams.get('state');
  const callback = responseRecorder();
  await auth.callback(
    { headers: { cookie: `gh3d_oauth_state=${state}` } },
    callback,
    new URL(`https://localhost:8081/auth/github/callback?state=${state}&code=abc`),
  );
  const sessionId = callback.headers.get('Set-Cookie').find((value) => value.startsWith('gh3d_session=')).match(/^gh3d_session=([^;]+)/u)[1];
  const session = auth.sessionFor({ headers: { cookie: `gh3d_session=${sessionId}` } });
  await auth.listRepositories(session);
  assert.match(String(requests[2].init.body), /grant_type=refresh_token/u);
  assert.equal(requests[3].init.headers.Authorization, 'Bearer new-access');
});

test('failed token refresh invalidates the session and requires sign-in again', async () => {
  const requests = [];
  const auth = createAuthService(env, async (url, init) => {
    requests.push({ url: String(url), init });
    if (requests.length === 1) return Response.json({ access_token: 'old-access', refresh_token: 'old-refresh', expires_in: 0 });
    if (requests.length === 2) return Response.json({ login: 'octocat' });
    return Response.json({ error: 'invalid_grant' }, { status: 400 });
  });
  const started = responseRecorder();
  const authorizeUrl = await auth.start(started);
  const state = authorizeUrl.searchParams.get('state');
  const callback = responseRecorder();
  await auth.callback(
    { headers: { cookie: `gh3d_oauth_state=${state}` } },
    callback,
    new URL(`https://localhost:8081/auth/github/callback?state=${state}&code=abc`),
  );
  const sessionId = callback.headers.get('Set-Cookie').find((value) => value.startsWith('gh3d_session=')).match(/^gh3d_session=([^;]+)/u)[1];
  const request = { headers: { cookie: `gh3d_session=${sessionId}` } };
  const session = auth.sessionFor(request);
  await assert.rejects(auth.listRepositories(session), { status: 401, message: 'GitHub session expired. Sign in again.' });
  assert.equal(auth.sessionFor(request), null);
});
