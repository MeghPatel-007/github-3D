import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { isValidRepositoryPart } from './github.mjs';

const MAX_OUTPUT = 2_000_000;

function workspaceId(login, owner, repo) {
  return createHash('sha256').update(`${login}:${owner}/${repo}`).digest('hex').slice(0, 32);
}

function fail(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function validateRepository(owner, repo) {
  if (!isValidRepositoryPart(owner) || !isValidRepositoryPart(repo)) throw fail('Invalid repository identifier.');
}

function runGit(cwd, args, options = {}) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn('git', args, { cwd, env: options.env, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    const append = (target, chunk) => {
      const value = target + chunk.toString();
      return value.length > MAX_OUTPUT ? value.slice(0, MAX_OUTPUT) : value;
    };
    child.stdout.on('data', (chunk) => { stdout = append(stdout, chunk); });
    child.stderr.on('data', (chunk) => { stderr = append(stderr, chunk); });
    const abort = () => child.kill('SIGTERM');
    options.signal?.addEventListener('abort', abort, { once: true });
    child.once('error', reject);
    child.once('close', (code, signal) => {
      options.signal?.removeEventListener('abort', abort);
      if (options.signal?.aborted) return reject(fail('Git operation was cancelled.', 499));
      if (code !== 0) return reject(fail(stderr.trim() || 'Git operation failed.', 502));
      resolvePromise(stdout.trim());
    });
  });
}

async function readSnapshot(repoPath, metadata) {
  const branch = await runGit(repoPath, ['symbolic-ref', '--quiet', '--short', 'HEAD']).catch(() => 'HEAD');
  const headSha = await runGit(repoPath, ['rev-parse', 'HEAD']).catch(() => null);
  const actualRemote = await runGit(repoPath, ['remote', 'get-url', 'origin']).catch(() => metadata.remoteUrl);
  const status = await runGit(repoPath, ['status', '--porcelain=v1', '--untracked-files=all']).catch(() => '');
  const lines = status ? status.split('\n').filter(Boolean) : [];
  const conflicted = lines.some((line) => line.slice(0, 2).includes('U') || line.startsWith('AA') || line.startsWith('DD'));
  const upstream = await runGit(repoPath, ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{upstream}']).catch(() => null);
  let ahead = 0;
  let behind = 0;
  if (upstream) {
    const counts = await runGit(repoPath, ['rev-list', '--left-right', '--count', `HEAD...${upstream}`]).catch(() => '0\t0');
    [ahead, behind] = counts.split(/\s+/u).map(Number);
  }
  return {
    id: metadata.id,
    repository: { owner: metadata.owner, name: metadata.repo },
    remoteUrl: safeRemoteUrl(actualRemote, metadata.remoteUrl),
    defaultBranch: metadata.defaultBranch,
    currentBranch: branch,
    headSha,
    upstreamSha: upstream ? await runGit(repoPath, ['rev-parse', upstream]).catch(() => null) : null,
    workingTree: conflicted ? 'conflicted' : lines.length ? 'modified' : 'clean',
    stagedCount: lines.filter((line) => line[0] !== ' ').length,
    unstagedCount: lines.filter((line) => line[1] !== ' ').length,
    sync: { ahead: Number.isFinite(ahead) ? ahead : 0, behind: Number.isFinite(behind) ? behind : 0 },
    operation: 'idle',
  };
}

async function readBranches(repoPath) {
  const current = await runGit(repoPath, ['symbolic-ref', '--quiet', '--short', 'HEAD']).catch(() => null);
  const list = async (ref, kind) => {
    const output = await runGit(repoPath, ['for-each-ref', '--format=%(refname:short)\t%(upstream:short)', ref]);
    return output ? output.split('\n').map((line) => {
      const [name, upstream = ''] = line.split('\t');
      return { name, kind, upstream: upstream || null, current: kind === 'local' && name === current };
    }) : [];
  };
  return [...await list('refs/heads', 'local'), ...await list('refs/remotes', 'remote')];
}

async function validBranchName(repoPath, name) {
  if (typeof name !== 'string' || name.length === 0 || name.length > 255) throw fail('Invalid branch name.');
  await runGit(repoPath, ['check-ref-format', '--branch', name]).catch(() => { throw fail('Invalid branch name.'); });
}

function authEnv(accessToken) {
  if (!accessToken) return process.env;
  return {
    ...process.env,
    GIT_TERMINAL_PROMPT: '0',
    GIT_CONFIG_COUNT: '1',
    GIT_CONFIG_KEY_0: 'http.https://github.com/.extraheader',
    GIT_CONFIG_VALUE_0: `AUTHORIZATION: bearer ${accessToken}`,
  };
}

function safeRemoteUrl(value, fallback) {
  try {
    const url = new URL(value);
    if ((url.protocol !== 'https:' && url.protocol !== 'http:') || url.hostname !== 'github.com') return fallback;
    url.username = '';
    url.password = '';
    return url.href;
  } catch {
    return fallback;
  }
}

export function createWorkspaceService({ rootDir = resolve('.tmp/workspaces'), repositoryMetadata, gitRunner = runGit } = {}) {
  const base = resolve(rootDir);

  async function metadataFor(login, owner, repo) {
    const id = workspaceId(login, owner, repo);
    const directory = join(base, id);
    try {
      return JSON.parse(await readFile(join(directory, 'workspace.json'), 'utf8'));
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      return null;
    }
  }

  async function open({ login, owner, repo, action = 'open', accessToken, signal }) {
    if (typeof login !== 'string' || !login) throw fail('Invalid session.');
    validateRepository(owner, repo);
    if (!['init', 'open', 'clone'].includes(action)) throw fail('Unsupported workspace action.');
    const remote = await repositoryMetadata(owner, repo, accessToken);
    const id = workspaceId(login, owner, repo);
    const directory = join(base, id);
    const repoPath = join(directory, 'repository');
    const metadataPath = join(directory, 'workspace.json');
    const existing = await metadataFor(login, owner, repo);
    const metadata = existing ?? {
      id, owner, repo, defaultBranch: remote.defaultBranch, remoteUrl: remote.remoteUrl ?? `https://github.com/${owner}/${repo}.git`, createdAt: new Date().toISOString(),
    };
    if (existing && action === 'clone') throw fail('Workspace already exists; refusing to overwrite it.', 409);
    await mkdir(directory, { recursive: true });
    if (existing && await readFile(join(repoPath, 'HEAD')).then(() => true).catch(() => false)) {
      return readSnapshot(repoPath, metadata);
    }
    const operationId = randomUUID();
    const temporaryPath = join(directory, `.repository-${operationId}`);
    try {
      if (action === 'init' || action === 'open') {
        await mkdir(repoPath, { recursive: true });
        await gitRunner(repoPath, ['init', '-b', remote.defaultBranch], { signal, env: process.env });
        await gitRunner(repoPath, ['remote', 'add', 'origin', metadata.remoteUrl], { signal, env: process.env });
      } else {
        await gitRunner(directory, ['clone', '--progress', metadata.remoteUrl, temporaryPath], { signal, env: authEnv(accessToken) });
        await rename(temporaryPath, repoPath);
      }
      await writeFile(metadataPath, JSON.stringify(metadata, null, 2));
      return readSnapshot(repoPath, metadata);
    } catch (error) {
      await rm(temporaryPath, { recursive: true, force: true });
      if (error.status === 499) throw error;
      throw fail(error.message === 'Git operation failed.' ? 'Workspace operation failed.' : error.message, error.status ?? 502);
    }
  }

  async function snapshot({ login, workspaceId: id }) {
    if (typeof login !== 'string' || !/^[a-f0-9]{32}$/u.test(id)) throw fail('Invalid workspace request.');
    const directory = join(base, id);
    const metadata = JSON.parse(await readFile(join(directory, 'workspace.json'), 'utf8').catch(() => { throw fail('Workspace was not found.', 404); }));
    if (workspaceId(login, metadata.owner, metadata.repo) !== id) throw fail('Workspace was not found.', 404);
    return readSnapshot(join(directory, 'repository'), metadata);
  }

  async function branchSnapshot({ login, workspaceId: id }) {
    const workspace = await snapshot({ login, workspaceId: id });
    return { ...workspace, branches: await readBranches(join(base, id, 'repository')) };
  }

  async function branchOperation({ login, workspaceId: id, operation, name, newName, startPoint }) {
    const current = await snapshot({ login, workspaceId: id });
    const repoPath = join(base, id, 'repository');
    if (operation === 'create') {
      await validBranchName(repoPath, name);
      await gitRunner(repoPath, ['branch', '--', name, startPoint || 'HEAD'], { env: process.env });
    } else if (operation === 'checkout') {
      await validBranchName(repoPath, name);
      try {
        await gitRunner(repoPath, ['switch', '--', name], { env: process.env });
      } catch (error) {
        throw fail(`Cannot switch to '${name}' without losing local changes.`, 409);
      }
    } else if (operation === 'rename') {
      await validBranchName(repoPath, name);
      await validBranchName(repoPath, newName);
      if (name.startsWith('origin/')) throw fail('Remote branches cannot be renamed here.');
      await gitRunner(repoPath, ['branch', '-m', '--', name, newName], { env: process.env });
    } else if (operation === 'delete') {
      await validBranchName(repoPath, name);
      if (name === current.currentBranch) throw fail('Cannot delete the checked-out branch.', 409);
      if (name.startsWith('origin/')) throw fail('Remote branches cannot be deleted here.');
      try {
        await gitRunner(repoPath, ['branch', '-d', '--', name], { env: process.env });
      } catch {
        throw fail(`Cannot delete '${name}' because it is not fully merged.`, 409);
      }
    } else {
      throw fail('Unsupported branch operation.');
    }
    return branchSnapshot({ login, workspaceId: id });
  }

  return { open, snapshot, branchSnapshot, branchOperation };
}
