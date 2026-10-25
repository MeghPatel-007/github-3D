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

test('lists branches and protects dirty checkout, current deletion, and unmerged deletion', async () => {
  const { root, remote } = await remoteRepository();
  const workspaceService = service(root, remote);
  const workspace = await workspaceService.open({ login: 'octocat', owner: 'octocat', repo: 'demo', action: 'clone' });
  const branches = await workspaceService.branchSnapshot({ login: 'octocat', workspaceId: workspace.id });
  assert.equal(branches.branches.some((branch) => branch.name === 'main' && branch.current), true);
  assert.equal(branches.branches.some((branch) => branch.name === 'origin/main' && branch.kind === 'remote'), true);

  await workspaceService.branchOperation({ login: 'octocat', workspaceId: workspace.id, operation: 'create', name: 'feature/test' });
  await workspaceService.branchOperation({ login: 'octocat', workspaceId: workspace.id, operation: 'rename', name: 'feature/test', newName: 'feature/renamed' });
  const created = await workspaceService.branchSnapshot({ login: 'octocat', workspaceId: workspace.id });
  assert.equal(created.branches.some((branch) => branch.name === 'feature/renamed' && branch.kind === 'local'), true);
  const repoPath = join(root, 'workspaces', workspace.id, 'repository');
  await exec('git', ['switch', 'feature/renamed'], { cwd: repoPath });
  await writeFile(join(repoPath, 'README.md'), 'feature change\n');
  await exec('git', ['add', 'README.md'], { cwd: repoPath });
  await exec('git', ['commit', '-m', 'feature base'], { cwd: repoPath });
  await exec('git', ['switch', 'main'], { cwd: repoPath });
  await writeFile(join(repoPath, 'README.md'), 'local change\n');
  await assert.rejects(workspaceService.branchOperation({ login: 'octocat', workspaceId: workspace.id, operation: 'checkout', name: 'feature/renamed' }), { status: 409 });
  await exec('git', ['restore', 'README.md'], { cwd: repoPath });
  await assert.rejects(workspaceService.branchOperation({ login: 'octocat', workspaceId: workspace.id, operation: 'delete', name: 'main' }), { status: 409 });

  await exec('git', ['switch', 'feature/renamed'], { cwd: repoPath });
  await writeFile(join(repoPath, 'feature.txt'), 'unmerged\n');
  await exec('git', ['add', 'feature.txt'], { cwd: repoPath });
  await exec('git', ['commit', '-m', 'feature'], { cwd: repoPath });
  await assert.rejects(workspaceService.branchOperation({ login: 'octocat', workspaceId: workspace.id, operation: 'delete', name: 'feature/renamed' }), { status: 409 });
});

test('reports Git status kinds and separate bounded staged and unstaged diffs', async () => {
  const { root, remote } = await remoteRepository();
  const workspaceService = service(root, remote);
  const workspace = await workspaceService.open({ login: 'octocat', owner: 'octocat', repo: 'demo', action: 'clone' });
  const repoPath = join(root, 'workspaces', workspace.id, 'repository');
  await writeFile(join(repoPath, 'README.md'), 'staged change\n');
  await exec('git', ['add', 'README.md'], { cwd: repoPath });
  await writeFile(join(repoPath, 'README.md'), 'unstaged change\n');
  await writeFile(join(repoPath, 'new.txt'), 'untracked\n');

  const state = await workspaceService.changes({ login: 'octocat', workspaceId: workspace.id });
  assert.deepEqual(state.changes.map(({ path, kind, staged, unstaged }) => ({ path, kind, staged, unstaged })), [
    { path: 'README.md', kind: 'modified', staged: true, unstaged: true },
    { path: 'new.txt', kind: 'untracked', staged: false, unstaged: true },
  ]);
  const staged = await workspaceService.diff({ login: 'octocat', workspaceId: workspace.id, path: 'README.md', staged: true });
  const unstaged = await workspaceService.diff({ login: 'octocat', workspaceId: workspace.id, path: 'README.md', staged: false });
  assert.match(staged.patch, /staged change/u);
  assert.doesNotMatch(staged.patch, /unstaged change/u);
  assert.match(unstaged.patch, /unstaged change/u);
  assert.match(unstaged.patch, /-staged change/u);
  const untracked = await workspaceService.diff({ login: 'octocat', workspaceId: workspace.id, path: 'new.txt', staged: false });
  assert.match(untracked.patch, /untracked/u);
});

test('identifies binary changes without rendering binary bytes as text', async () => {
  const { root, remote } = await remoteRepository();
  const workspaceService = service(root, remote);
  const workspace = await workspaceService.open({ login: 'octocat', owner: 'octocat', repo: 'demo', action: 'clone' });
  const repoPath = join(root, 'workspaces', workspace.id, 'repository');
  await writeFile(join(repoPath, 'image.bin'), Buffer.from([0, 1, 2, 3]));
  const diff = await workspaceService.diff({ login: 'octocat', workspaceId: workspace.id, path: 'image.bin', staged: false });
  assert.equal(diff.binary, true);
  assert.equal(diff.unsupported, true);
  assert.equal(diff.patch.includes('\u0000'), false);
});

test('distinguishes renamed and deleted paths from Git status', async () => {
  const { root, remote } = await remoteRepository();
  const workspaceService = service(root, remote);
  const workspace = await workspaceService.open({ login: 'octocat', owner: 'octocat', repo: 'demo', action: 'clone' });
  const repoPath = join(root, 'workspaces', workspace.id, 'repository');
  await exec('git', ['mv', 'README.md', 'renamed.md'], { cwd: repoPath });
  const renamed = await workspaceService.changes({ login: 'octocat', workspaceId: workspace.id });
  assert.deepEqual(renamed.changes[0], { path: 'renamed.md', kind: 'renamed', oldPath: 'README.md', staged: true, unstaged: false });
  await exec('git', ['rm', '-f', 'renamed.md'], { cwd: repoPath });
  const deleted = await workspaceService.changes({ login: 'octocat', workspaceId: workspace.id });
  assert.equal(deleted.changes[0].kind, 'deleted');
  assert.equal(['README.md', 'renamed.md'].includes(deleted.changes[0].path), true);
});
