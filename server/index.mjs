import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createAuthService } from './auth.mjs';
import { fetchPublicRepositoryFile, getRepositoryMetadata, importPublicRepository } from './github.mjs';
import { createWorkspaceService } from './workspace.mjs';

try {
  process.loadEnvFile('.env');
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}

const errorCodes = new Map([[400, 'INVALID_REQUEST'], [401, 'UNAUTHENTICATED'], [403, 'FORBIDDEN'], [404, 'REPOSITORY_NOT_FOUND'], [413, 'CONTENT_TOO_LARGE'], [415, 'UNSUPPORTED_CONTENT'], [429, 'RATE_LIMITED'], [502, 'UPSTREAM_GITHUB_ERROR'], [503, 'AUTH_UNAVAILABLE']]);

function decodeSegment(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    const error = new Error('Invalid repository path.');
    error.status = 400;
    throw error;
  }
}

function assertSameOrigin(request) {
  const expected = process.env.WEB_ORIGIN;
  const origin = request.headers.origin;
  if (!expected || !origin || origin !== new URL(expected).origin) {
    const error = new Error('Request origin is not allowed.');
    error.status = 403;
    throw error;
  }
}

async function readJson(request) {
  let raw = '';
  for await (const chunk of request) {
    raw += chunk;
    if (raw.length > 8192) {
      const error = new Error('Request body is too large.');
      error.status = 413;
      throw error;
    }
  }
  try {
    return JSON.parse(raw);
  } catch {
    const error = new Error('Request body must be valid JSON.');
    error.status = 400;
    throw error;
  }
}

export function createApiServer() {
  const auth = createAuthService();
  const workspaces = createWorkspaceService({
    repositoryMetadata: (owner, repo, accessToken) => getRepositoryMetadata(owner, repo, accessToken),
  });
  const withOptionalAccess = async (request, operation) => {
    const session = auth.sessionFor(request);
    if (!session) return operation(undefined);
    try {
      return await operation(await auth.accessTokenFor(session));
    } catch (error) {
      if (error.status === 401) auth.invalidate(session);
      throw error;
    }
  };
  return createServer(async (request, response) => {
    const startedAt = performance.now();
    const requestId = randomUUID();
    let route = 'unknown';
    let status = 200;
    response.setHeader('X-Request-Id', requestId);
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    try {
      const url = new URL(request.url ?? '/', 'http://localhost');
      let result;
      if (request.method === 'GET' && url.pathname === '/auth/github') {
        route = 'GET /auth/github';
        const authorizationUrl = await auth.start(response);
        status = 302;
        response.writeHead(status, { Location: authorizationUrl.href }).end();
        return;
      } else if (request.method === 'GET' && url.pathname === '/auth/github/callback') {
        route = 'GET /auth/github/callback';
        const destination = await auth.callback(request, response, url);
        status = 302;
        response.writeHead(status, { Location: destination.href }).end();
        return;
      } else if (request.method === 'GET' && url.pathname === '/api/health') {
        route = 'GET /api/health';
        result = { status: 'ok' };
      } else if (request.method === 'GET' && url.pathname === '/api/v1/auth-config') {
        route = 'GET /api/v1/auth-config';
        result = { configured: auth.configured, installUrl: auth.installUrl };
      } else if (request.method === 'GET' && url.pathname === '/api/v1/session') {
        route = 'GET /api/v1/session';
        result = auth.publicSession(auth.sessionFor(request));
      } else if (request.method === 'POST' && url.pathname === '/api/v1/logout') {
        route = 'POST /api/v1/logout';
        if (auth.sessionFor(request)) assertSameOrigin(request);
        auth.logout(request, response);
        result = { ok: true };
      } else if (request.method === 'GET' && url.pathname === '/api/v1/repositories') {
        route = 'GET /api/v1/repositories';
        const session = auth.sessionFor(request);
        if (!session) {
          const error = new Error('Sign in with GitHub to list your repositories.');
          error.status = 401;
          throw error;
        }
        result = await auth.listRepositories(session, url.searchParams.get('cursor') ?? undefined, url.searchParams.get('q') ?? '');
      } else if (request.method === 'POST' && url.pathname === '/api/v1/repositories/import') {
        route = 'POST /api/v1/repositories/import';
        if (auth.sessionFor(request)) assertSameOrigin(request);
        const body = await readJson(request);
        if (body == null || typeof body !== 'object' || Array.isArray(body)) {
          const error = new Error('Request body must be a JSON object.');
          error.status = 400;
          throw error;
        }
        result = await withOptionalAccess(request, (accessToken) => importPublicRepository({ ...body, accessToken }));
      } else if (request.method === 'POST' && url.pathname === '/api/v1/workspaces') {
        route = 'POST /api/v1/workspaces';
        const session = auth.sessionFor(request);
        if (!session) throw Object.assign(new Error('Sign in with GitHub to use workspaces.'), { status: 401 });
        assertSameOrigin(request);
        const body = await readJson(request);
        if (body == null || typeof body !== 'object' || Array.isArray(body)) throw Object.assign(new Error('Request body must be a JSON object.'), { status: 400 });
        const operationController = new AbortController();
        request.once('aborted', () => operationController.abort());
        result = await workspaces.open({
          login: session.user.login,
          owner: body.owner,
          repo: body.repo,
          action: body.action,
          accessToken: await auth.accessTokenFor(session),
          signal: operationController.signal,
        });
      } else if (url.pathname.startsWith('/api/v1/workspaces/')) {
        const branchMatch = url.pathname.match(/^\/api\/v1\/workspaces\/([^/]+)\/branches(?:\/([^/]+))?$/u);
        const changeMatch = url.pathname.match(/^\/api\/v1\/workspaces\/([^/]+)\/changes(?:\/diff)?$/u);
        const session = auth.sessionFor(request);
        if (!session) throw Object.assign(new Error('Sign in with GitHub to use workspaces.'), { status: 401 });
        const id = branchMatch ? decodeSegment(branchMatch[1]) : decodeSegment(url.pathname.slice('/api/v1/workspaces/'.length));
        if (changeMatch) {
          const changeId = decodeSegment(changeMatch[1]);
          if (request.method !== 'GET') assertSameOrigin(request);
          if (url.pathname.endsWith('/diff')) {
            route = 'GET /api/v1/workspaces/:workspaceId/changes/diff';
            result = await workspaces.diff({ login: session.user.login, workspaceId: changeId, path: url.searchParams.get('path'), staged: url.searchParams.get('staged') === 'true' });
          } else {
            route = 'GET /api/v1/workspaces/:workspaceId/changes';
            result = await workspaces.changes({ login: session.user.login, workspaceId: changeId });
          }
        } else if (branchMatch) {
          if (request.method !== 'GET') assertSameOrigin(request);
          const branchId = decodeSegment(branchMatch[1]);
          if (request.method === 'GET') {
            route = 'GET /api/v1/workspaces/:workspaceId/branches';
            result = await workspaces.branchSnapshot({ login: session.user.login, workspaceId: branchId });
          } else {
            const body = await readJson(request);
            const operation = request.method === 'PATCH' ? 'rename' : request.method === 'DELETE' ? 'delete' : body?.operation;
            route = `${request.method} /api/v1/workspaces/:workspaceId/branches`;
            result = await workspaces.branchOperation({ login: session.user.login, workspaceId: branchId, operation, name: body?.name ?? decodeSegment(branchMatch[2] ?? ''), newName: body?.newName, startPoint: body?.startPoint });
          }
        } else {
          route = 'GET /api/v1/workspaces/:workspaceId';
          result = await workspaces.snapshot({ login: session.user.login, workspaceId: id });
        }
      } else {
        const match = url.pathname.match(/^\/api\/v1\/repositories\/([^/]+)\/([^/]+)\/contents$/u);
        if (request.method !== 'GET' || !match) {
          status = 404;
          result = { error: { code: 'NOT_FOUND', message: 'API route not found.', requestId } };
        } else {
          route = 'GET /api/v1/repositories/:owner/:repo/contents';
          result = await withOptionalAccess(request, (accessToken) => fetchPublicRepositoryFile({
            owner: decodeSegment(match[1]),
            repo: decodeSegment(match[2]),
            path: url.searchParams.get('path'),
            commitSha: url.searchParams.get('sha'),
            accessToken,
          }));
        }
      }
      response.writeHead(status, { 'Content-Type': 'application/json' }).end(JSON.stringify(result));
    } catch (error) {
      status = error.status ?? 502;
      const code = errorCodes.get(status) ?? 'UPSTREAM_GITHUB_ERROR';
      if (status === 502) console.error(JSON.stringify({ requestId, route, status, durationMs: Math.round(performance.now() - startedAt), errorCode: code }));
      if (error.retryAfter) response.setHeader('Retry-After', error.retryAfter);
      response.writeHead(status, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: { code, message: error.message, requestId } }));
    } finally {
      if (status < 500) console.info(JSON.stringify({ requestId, route, status, durationMs: Math.round(performance.now() - startedAt) }));
    }
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = 3001;
  createApiServer().listen(port, '127.0.0.1', () => console.info(`GitHub 3D API listening on 127.0.0.1:${port}`));
}
