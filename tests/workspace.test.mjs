import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, readdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import test from 'node:test';
import { createWorkspaceService } from '../server/workspace.mjs';

const exec = promisify(execFile);

async function git(cwd, ...args) {
  await exec('git', args, { cwd });
}

async function remoteRepository() {
  const root = await mkdtemp(join(tmpdir(), 'gh3d-remote-'));
  const source = join(root, 'source');
  const remote = join(root, 'remote.git');
  await git(root, 'init', '--bare', remote);
  await git(root, 'init', '-b', 'main', source);
  await git(source, 'config', 'user.email', 'test@example.com');
  await git(source, 'config', 'user.name', 'Test User');
  await writeFile(join(source, 'README.md'), 'workspace test\n');
  await git(source, 'add', 'README.md');
  await git(source, 'commit', '-m', 'initial');
  await git(source, 'remote', 'add', 'origin', remote);
  await git(source, 'push', '-u', 'origin', 'main');
  await git(remote, 'symbolic-ref', 'HEAD', 'refs/heads/main');
  return { root, remote };
}

function service(root, remoteUrl, gitRunner) {
  return createWorkspaceService({
    rootDir: join(root, 'workspaces'),
    repositoryMetadata: async () => ({ defaultBranch: 'main', remoteUrl }),
    ...(gitRunner ? { gitRunner } : {}),
  });
}

test('initializes a real workspace and reports confirmed Git state', async () => {
  const root = await mkdtemp(join(tmpdir(), 'gh3d-init-'));
  const workspace = await service(root, 'https://github.com/octocat/demo.git').open({ login: 'octocat', owner: 'octocat', repo: 'demo', action: 'init' });
  assert.equal(workspace.currentBranch, 'main');
  assert.equal(workspace.headSha, null);
  assert.equal(workspace.workingTree, 'clean');
  assert.equal(workspace.remoteUrl, 'https://github.com/octocat/demo.git');
  assert.equal(workspace.operation, 'idle');
  const resumed = await service(root, 'https://github.com/octocat/demo.git').snapshot({ login: 'octocat', workspaceId: workspace.id });
  assert.equal(resumed.id, workspace.id);
});

test('clones an authorized remote without exposing credentials or overwriting workspaces', async () => {
  const { root, remote } = await remoteRepository();
  const workspace = await service(root, remote).open({ login: 'octocat', owner: 'octocat', repo: 'demo', action: 'clone', accessToken: 'not-written-to-disk' });
  assert.match(workspace.headSha, /^[a-f0-9]{40}$/u);
  assert.equal(workspace.currentBranch, 'main');
  assert.equal(await readFile(join(root, 'workspaces', workspace.id, 'repository', 'README.md'), 'utf8'), 'workspace test\n');
  await assert.rejects(service(root, remote).open({ login: 'octocat', owner: 'octocat', repo: 'demo', action: 'clone' }), { status: 409 });
  assert.equal((await readFile(join(root, 'workspaces', workspace.id, 'workspace.json'), 'utf8')).includes('not-written-to-disk'), false);
});

test('failed clone cleans its temporary directory and preserves existing data', async () => {
  const root = await mkdtemp(join(tmpdir(), 'gh3d-failure-'));
  const workspace = service(root, '/missing/remote').open({ login: 'octocat', owner: 'octocat', repo: 'broken', action: 'clone' });
  await assert.rejects(workspace, { status: 502 });
  const entries = await readdir(join(root, 'workspaces')).catch(() => []);
  assert.equal(entries.length, 1);
  assert.match(entries[0], /^[a-f0-9]{32}$/u);
  assert.equal((await readdir(join(root, 'workspaces', entries[0]))).length, 0);
});

test('cancellation reports unknown completion and leaves no partial clone', async () => {
  const root = await mkdtemp(join(tmpdir(), 'gh3d-cancel-'));
  const cancelled = async () => { const error = new Error('Git operation was cancelled.'); error.status = 499; throw error; };
  await assert.rejects(service(root, 'https://github.com/octocat/demo.git', cancelled).open({ login: 'octocat', owner: 'octocat', repo: 'demo', action: 'clone' }), { status: 499 });
});
