import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { isValidRepositoryPart } from './github.mjs';

const MAX_OUTPUT = 2_000_000;
const MAX_DIFF = 200_000;

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
      if (code !== 0 && !options.allowFailure) return reject(fail(stderr.trim() || 'Git operation failed.', 502));
      resolvePromise(options.preserveWhitespace ? stdout : stdout.trim());
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
  const mergeHead = await runGit(repoPath, ['rev-parse', '--verify', 'MERGE_HEAD']).catch(() => null);
  const rebase = await runGit(repoPath, ['rev-parse', '--git-path', 'rebase-merge']).then((path) => readFile(join(repoPath, path.trim(), 'head-name'), 'utf8').then(() => true)).catch(() => false);
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
    workingTree: conflicted || mergeHead || rebase ? 'conflicted' : lines.length ? 'modified' : 'clean',
    stagedCount: lines.filter((line) => line[0] !== ' ').length,
    unstagedCount: lines.filter((line) => line[1] !== ' ').length,
    sync: { ahead: Number.isFinite(ahead) ? ahead : 0, behind: Number.isFinite(behind) ? behind : 0 },
    operation: conflicted || mergeHead || rebase ? 'conflict' : 'idle',
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

function parseStatus(output) {
  const parts = output ? output.split('\0').filter(Boolean) : [];
  const changes = [];
  for (let index = 0; index < parts.length; index += 1) {
    const record = parts[index];
    const x = record[0];
    const y = record[1];
    const path = record.slice(3);
    const renamed = x === 'R' || y === 'R';
    const oldPath = renamed ? parts[++index] : undefined;
    const kind = x === '?' && y === '?' ? 'untracked' : renamed ? 'renamed' : x === 'A' || y === 'A' ? 'added' : x === 'D' || y === 'D' ? 'deleted' : 'modified';
    changes.push({ path, kind, ...(oldPath ? { oldPath } : {}), staged: x !== ' ' && x !== '?', unstaged: x === '?' || y !== ' ' && y !== '?' });
  }
  return changes;
}

function changePaths(paths) {
  if (!Array.isArray(paths) || paths.length === 0 || paths.length > 100) throw fail('Select at least one changed path.');
  const unique = [...new Set(paths)];
  if (unique.length !== paths.length || unique.some((path) => typeof path !== 'string' || !path || path.startsWith('/') || path.includes('\\') || path.split('/').some((part) => !part || part === '.' || part === '..'))) {
    throw fail('Invalid change path.');
  }
  return unique;
}

function commitInput(message, authorName, authorEmail) {
  if (typeof message !== 'string' || !message.trim() || message.length > 5000 || message.includes('\0')) throw fail('Commit message must contain 1-5000 characters.');
  if (typeof authorName !== 'string' || !authorName.trim() || authorName.length > 200 || authorName.includes('\0')) throw fail('Commit author name is invalid.');
  if (typeof authorEmail !== 'string' || authorEmail.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(authorEmail) || authorEmail.includes('\0')) throw fail('Commit author email is invalid.');
  return { message, authorName, authorEmail };
}

function boundedDiff(patch, path, staged, metadata = {}) {
  const truncated = patch.length > MAX_DIFF;
  return {
    path,
    staged,
    binary: metadata.binary === true,
    unsupported: metadata.binary === true,
    truncated,
    patch: truncated ? `${patch.slice(0, MAX_DIFF)}\n[Diff truncated at ${MAX_DIFF} characters]` : patch,
  };
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

  async function changes({ login, workspaceId: id }) {
    const workspace = await snapshot({ login, workspaceId: id });
    const output = await runGit(join(base, id, 'repository'), ['status', '--porcelain=v1', '-z', '--untracked-files=all'], { preserveWhitespace: true });
    return { ...workspace, changes: parseStatus(output) };
  }

  async function diff({ login, workspaceId: id, path, staged = false }) {
    const workspace = await snapshot({ login, workspaceId: id });
    if (typeof path !== 'string' || !path || path.startsWith('/') || path.includes('\\') || path.split('/').some((part) => !part || part === '.' || part === '..')) throw fail('Invalid change path.');
    const repoPath = join(base, id, 'repository');
    const args = ['diff', '--no-ext-diff', '--binary', '--unified=3', ...(staged ? ['--cached'] : []), '--', path];
    let patch = await runGit(repoPath, args).catch(() => '');
    if (!patch && !staged) patch = await runGit(repoPath, ['diff', '--no-ext-diff', '--binary', '--no-index', '--unified=3', '/dev/null', `./${path}`], { allowFailure: true }).catch(() => '');
    const numstat = await runGit(repoPath, ['diff', ...(staged ? ['--cached'] : []), '--numstat', '--', path]).catch(() => '');
    const binary = numstat.split('\n').some((line) => line.startsWith('-\t-\t')) || await readFile(join(repoPath, path)).then((value) => value.includes(0)).catch(() => false);
    return boundedDiff(patch, path, staged, { binary });
  }

  async function changeOperation({ login, workspaceId: id, operation, paths, confirmPaths }) {
    const selected = changePaths(paths);
    const current = await changes({ login, workspaceId: id });
    const currentPaths = new Set(current.changes.map((change) => change.path));
    if (selected.some((path) => !currentPaths.has(path))) throw fail('Workspace changes are stale; refresh and try again.', 409);
    if (!['stage', 'unstage', 'discard'].includes(operation)) throw fail('Unsupported change operation.');
    if (operation === 'discard') {
      if (!Array.isArray(confirmPaths) || confirmPaths.length !== selected.length || new Set(confirmPaths).size !== selected.length || confirmPaths.some((path) => !selected.includes(path))) {
        throw fail('Discard requires confirmation for every selected path.', 400);
      }
    }
    const repoPath = join(base, id, 'repository');
    if (operation === 'stage') {
      await runGit(repoPath, ['add', '--', ...selected]);
    } else if (operation === 'unstage') {
      await runGit(repoPath, ['reset', '--', ...selected]);
    } else {
      const selectedChanges = current.changes.filter((change) => selected.includes(change.path));
      const headPaths = await runGit(repoPath, ['ls-tree', '-r', '--name-only', 'HEAD', '--', ...selected], { allowFailure: true });
      const headTracked = new Set(headPaths.split('\n').filter(Boolean));
      const restore = selectedChanges.flatMap((change) => [
        ...(headTracked.has(change.path) ? [change.path] : []),
        ...(change.oldPath && headTracked.has(change.oldPath) ? [change.oldPath] : []),
      ]);
      const remove = selectedChanges.filter((change) => !headTracked.has(change.path)).map((change) => change.path);
      const reset = selectedChanges.filter((change) => change.staged && !headTracked.has(change.path)).map((change) => change.path);
      if (reset.length) await runGit(repoPath, ['reset', '--', ...reset]);
      if (remove.length) await runGit(repoPath, ['clean', '-f', '--', ...remove]);
      if (restore.length) await runGit(repoPath, ['restore', '--source=HEAD', '--staged', '--worktree', '--', ...new Set(restore)]);
    }
    return changes({ login, workspaceId: id });
  }

  async function commit({ login, workspaceId: id, message, authorName, authorEmail }) {
    const workspace = await snapshot({ login, workspaceId: id });
    const input = commitInput(message, authorName, authorEmail);
    const repoPath = join(base, id, 'repository');
    const status = await runGit(repoPath, ['status', '--porcelain=v1', '--untracked-files=all'], { preserveWhitespace: true });
    if (!status || !status.split('\n').some((line) => line[0] !== ' ' && line[0] !== '?')) throw fail('Stage at least one change before committing.', 409);
    try {
      await runGit(repoPath, ['-c', `user.name=${input.authorName}`, '-c', `user.email=${input.authorEmail}`, 'commit', '-m', input.message], { env: process.env });
    } catch (error) {
      throw fail(`Commit failed: ${error.message}`, error.status ?? 502);
    }
    const sha = await runGit(repoPath, ['rev-parse', 'HEAD']);
    return {
      ...await snapshot({ login, workspaceId: id }),
      commit: { sha, message: input.message, authorName: input.authorName, authorEmail: input.authorEmail },
      changes: (await changes({ login, workspaceId: id })).changes,
    };
  }

  async function remoteOperation({ login, workspaceId: id, operation, accessToken }) {
    const workspace = await snapshot({ login, workspaceId: id });
    if (!['fetch', 'pull', 'push'].includes(operation)) throw fail('Unsupported remote operation.');
    if (!accessToken) throw fail('GitHub authorization is required for remote synchronization.', 403);
    if (!workspace.currentBranch || workspace.currentBranch === 'HEAD') throw fail('A checked-out branch is required for synchronization.', 409);
    if (operation !== 'fetch' && workspace.workingTree === 'conflicted') throw fail('Resolve the current conflict before synchronizing.', 409);
    const repoPath = join(base, id, 'repository');
    try {
      if (operation === 'fetch') await runGit(repoPath, ['fetch', '--progress', 'origin'], { env: authEnv(accessToken) });
      if (operation === 'pull') await runGit(repoPath, ['pull', '--ff-only', '--progress', 'origin', workspace.currentBranch], { env: authEnv(accessToken) });
      if (operation === 'push') await runGit(repoPath, ['push', '--progress', '--set-upstream', 'origin', workspace.currentBranch], { env: authEnv(accessToken) });
    } catch (error) {
      const message = error.message.includes('Not possible to fast-forward') || error.message.includes('non-fast-forward')
        ? 'Remote and local history diverged. Fetch and choose a recovery path before pulling or pushing.'
        : error.message;
      throw fail(`Git ${operation} failed: ${message}`, error.status ?? 502);
    }
    return snapshot({ login, workspaceId: id });
  }

  async function conflictSnapshot({ login, workspaceId: id }) {
    const workspace = await snapshot({ login, workspaceId: id });
    const repoPath = join(base, id, 'repository');
    const status = await runGit(repoPath, ['status', '--porcelain=v1', '--untracked-files=all'], { preserveWhitespace: true });
    const paths = status.split('\n').filter((line) => line && (line.slice(0, 2).includes('U') || line.startsWith('AA') || line.startsWith('DD'))).map((line) => line.slice(3));
    const merge = await runGit(repoPath, ['rev-parse', '--verify', 'MERGE_HEAD']).then(() => true).catch(() => false);
    const rebase = await runGit(repoPath, ['rev-parse', '--git-path', 'rebase-merge']).then((path) => readFile(join(repoPath, path.trim(), 'head-name'), 'utf8').then(() => true)).catch(() => false);
    return { ...workspace, conflict: { paths, operation: merge ? 'merge' : rebase ? 'unsupported' : 'none' } };
  }

  async function conflictOperation({ login, workspaceId: id, operation }) {
    const current = await conflictSnapshot({ login, workspaceId: id });
    if (!['abort', 'continue'].includes(operation)) throw fail('Unsupported conflict operation.');
    if (current.conflict.operation === 'unsupported') throw fail('Rebase conflicts are preserved but unsupported; resolve them with Git before continuing.', 409);
    if (current.conflict.operation !== 'merge') throw fail('No supported conflict operation is active.', 409);
    const repoPath = join(base, id, 'repository');
    try {
      await runGit(repoPath, ['merge', operation === 'abort' ? '--abort' : '--continue'], { env: { ...process.env, GIT_EDITOR: 'true' } });
    } catch (error) {
      throw fail(`Conflict ${operation} failed: ${error.message}`, error.status ?? 409);
    }
    return conflictSnapshot({ login, workspaceId: id });
  }

  async function history({ login, workspaceId: id, cursor = '0', limit = 20 }) {
    await snapshot({ login, workspaceId: id });
    const offset = Number.parseInt(cursor, 10);
    const size = Number.parseInt(limit, 10);
    if (!Number.isInteger(offset) || offset < 0 || !Number.isInteger(size) || size < 1 || size > 50) throw fail('Invalid history pagination.');
    const repoPath = join(base, id, 'repository');
    const commits = await runGit(repoPath, ['log', `--skip=${offset}`, `-n${size + 1}`, '--format=%H%x1f%an%x1f%ae%x1f%aI%x1f%s', '--name-status']);
    const records = commits.split('\n').reduce((groups, line) => {
      if (line.includes('\x1f')) groups.push([line]);
      else if (line && groups.length) groups.at(-1).push(line);
      return groups;
    }, []).map(([header, ...statusLines]) => {
      const [sha, authorName, authorEmail, date, message] = header.split('\x1f');
      const paths = statusLines.filter(Boolean).map((line) => {
        const [status, path, oldPath] = line.split('\t');
        return { status, path, ...(status === 'R' || status === 'R100' ? { oldPath } : {}) };
      });
      return { sha, author: { name: authorName, email: authorEmail }, date, message, paths };
    });
    const hasMore = records.length > size;
    return { items: records.slice(0, size), nextCursor: hasMore ? String(offset + size) : null };
  }

  async function compare({ login, workspaceId: id, from, to }) {
    await snapshot({ login, workspaceId: id });
    if (typeof from !== 'string' || typeof to !== 'string' || !from || !to || from.includes('..') || to.includes('..')) throw fail('Invalid revision comparison.');
    const repoPath = join(base, id, 'repository');
    const output = await runGit(repoPath, ['diff', '--name-status', '--no-renames', from, to]);
    const paths = output.split('\n').filter(Boolean).map((line) => {
      const [status, path] = line.split('\t');
      return { status, path };
    });
    return { from, to, paths };
  }

  return { open, snapshot, branchSnapshot, branchOperation, changes, diff, changeOperation, commit, remoteOperation, conflictSnapshot, conflictOperation, history, compare };
}
