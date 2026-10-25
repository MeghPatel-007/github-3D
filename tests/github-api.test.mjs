import assert from 'node:assert/strict';
import test from 'node:test';
import { once } from 'node:events';
import { createApiServer } from '../server/index.mjs';
import { createPullRequest, fetchPublicRepositoryFile, importPublicRepository, isCommitSha, isSafeRepositoryPath, isValidRepositoryPart } from '../server/github.mjs';

test('repository identifiers, paths, and revisions reject unsafe values', () => {
  assert.equal(isValidRepositoryPart('octocat'), true);
  assert.equal(isValidRepositoryPart('../etc'), false);
  assert.equal(isSafeRepositoryPath('src/main.ts'), true);
  assert.equal(isSafeRepositoryPath('../secret'), false);
  assert.equal(isSafeRepositoryPath('src/../secret'), false);
  assert.equal(isCommitSha('a'.repeat(40)), true);
  assert.equal(isCommitSha('main'), false);
});

test('API rejects malformed public import before contacting GitHub', async (context) => {
  const server = createApiServer().listen(0, '127.0.0.1');
  await once(server, 'listening');
  context.after(() => new Promise((resolve) => server.close(resolve)));
  const address = server.address();
  const response = await fetch(`http://127.0.0.1:${address.port}/api/v1/repositories/import`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ owner: '../private', repo: 'x' }),
  });
  const payload = await response.json();
  assert.equal(response.status, 400);
  assert.equal(payload.error.code, 'INVALID_REQUEST');
  assert.equal(response.headers.get('x-request-id'), payload.error.requestId);
});

test('API rejects valid JSON that is not an object', async (context) => {
  const server = createApiServer().listen(0, '127.0.0.1');
  await once(server, 'listening');
  context.after(() => new Promise((resolve) => server.close(resolve)));
  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/v1/repositories/import`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: 'null',
  });
  assert.equal(response.status, 400);
  assert.equal((await response.json()).error.code, 'INVALID_REQUEST');
});

test('repository listing requires a session while session status stays safe', async (context) => {
  const server = createApiServer().listen(0, '127.0.0.1');
  await once(server, 'listening');
  context.after(() => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const session = await fetch(`${base}/api/v1/session`).then((response) => response.json());
  assert.deepEqual(session, { authenticated: false, user: null });
  const repositories = await fetch(`${base}/api/v1/repositories`);
  assert.equal(repositories.status, 401);
  assert.equal((await repositories.json()).error.code, 'UNAUTHENTICATED');
});

test('public import resolves mutable ref once and fetches tree by its tree SHA', async () => {
  const commitSha = 'a'.repeat(40);
  const treeSha = 'b'.repeat(40);
  const calls = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    if (calls.length === 1) return Response.json({ private: false, owner: { login: 'octocat' }, name: 'demo', default_branch: 'main' });
    if (calls.length === 2) return Response.json({ sha: commitSha, commit: { tree: { sha: treeSha } } });
    return Response.json({ truncated: false, tree: [{ path: 'src', type: 'tree' }, { path: 'src/main.ts', type: 'blob', size: 12 }] });
  };
  try {
    const result = await importPublicRepository({ owner: 'octocat', repo: 'demo', ref: 'main' });
    assert.equal(result.commitSha, commitSha);
    assert.equal(result.entries[1].path, 'src/main.ts');
    assert.match(calls[2], new RegExp(`/git/trees/${treeSha}\\?recursive=1$`, 'u'));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('file content request stays pinned to the resolved commit', async () => {
  const commitSha = 'c'.repeat(40);
  const originalFetch = globalThis.fetch;
  let requestedUrl = '';
  globalThis.fetch = async (url) => {
    requestedUrl = String(url);
    return Response.json({ type: 'file', size: 7, encoding: 'base64', content: Buffer.from('export{}').toString('base64') });
  };
  try {
    const result = await fetchPublicRepositoryFile({ owner: 'octocat', repo: 'demo', path: 'src/main.ts', commitSha });
    assert.equal(result.content, 'export{}');
    assert.equal(result.commitSha, commitSha);
    assert.ok(requestedUrl.endsWith(`?ref=${commitSha}`));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('pull request creation checks existing heads and keeps GitHub responses bounded', async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    return calls.length === 1 ? Response.json([]) : Response.json({ html_url: 'https://github.com/octocat/demo/pull/4', number: 4 });
  };
  try {
    const result = await createPullRequest({ owner: 'octocat', repo: 'demo', base: 'main', head: 'feature/test', title: 'Add feature', body: 'Details', accessToken: 'server-only' });
    assert.deepEqual(result, { existing: false, url: 'https://github.com/octocat/demo/pull/4', number: 4 });
    assert.equal(calls[1].init.method, 'POST');
    assert.equal(JSON.parse(calls[1].init.body).head, 'feature/test');
    assert.equal(calls[1].init.headers.Authorization, 'Bearer server-only');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
