import assert from 'node:assert/strict';
import test from 'node:test';
import { importPublicRepository, parseGitHubRepositoryUrl, RepositoryApiError } from '../src/repository-api.ts';

const validImportResponse = () => ({
  owner: 'octocat',
  name: 'hello-world',
  private: false,
  defaultBranch: 'main',
  ref: 'main',
  commitSha: 'a'.repeat(40),
  truncated: false,
  unsupportedCount: 0,
  entries: [{ path: 'src/main.ts', type: 'blob', size: 12 }],
});

async function assertInvalidImportResponse(response: ReturnType<typeof validImportResponse>) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => Response.json(response);
  try {
    await assert.rejects(importPublicRepository('octocat', 'hello-world'), (error: unknown) =>
      error instanceof RepositoryApiError && error.message === 'Repository response was invalid.');
  } finally {
    globalThis.fetch = originalFetch;
  }
}

test('repository URL parser accepts only direct HTTPS GitHub repository URLs', () => {
  assert.deepEqual(parseGitHubRepositoryUrl('https://github.com/octocat/hello-world.git'), {
    owner: 'octocat',
    repo: 'hello-world',
  });
  assert.equal(parseGitHubRepositoryUrl('http://github.com/octocat/hello-world'), null);
  assert.equal(parseGitHubRepositoryUrl('https://github.com.evil.test/octocat/hello-world'), null);
  assert.equal(parseGitHubRepositoryUrl('https://user@github.com/octocat/hello-world'), null);
  assert.equal(parseGitHubRepositoryUrl('https://github.com/octocat/hello-world/tree/main'), null);
});

test('import rejects a response with an invalid commit SHA', async () => {
  const response = validImportResponse();
  response.commitSha = 'main';
  await assertInvalidImportResponse(response);
});

test('import rejects a response with a traversal path', async () => {
  const response = validImportResponse();
  response.entries = [{ path: '../secret', type: 'blob' }];
  await assertInvalidImportResponse(response);
});

test('import rejects a response with more than 10,000 entries', async () => {
  const response = validImportResponse();
  response.entries = Array.from({ length: 10_001 }, (_, index) => ({ path: `file-${index}.ts`, type: 'blob' as const }));
  await assertInvalidImportResponse(response);
});
