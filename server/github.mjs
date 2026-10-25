const GITHUB_API = 'https://api.github.com';
const USER_AGENT = 'github-3D-repository-explorer';
const MAX_TREE_ENTRIES = 10_000;
const MAX_INLINE_BYTES = 200_000;
const MAX_UPSTREAM_JSON_BYTES = 12_000_000;

export function isValidRepositoryPart(value) {
  return typeof value === 'string' && /^[A-Za-z0-9_.-]{1,100}$/u.test(value) && value !== '.' && value !== '..';
}

export function isSafeRepositoryPath(value) {
  return typeof value === 'string' && value.length > 0 && value.length <= 1024 &&
    !value.startsWith('/') && !value.includes('\\') && !value.includes('\0') &&
    value.split('/').every((part) => part !== '' && part !== '.' && part !== '..');
}

export function isCommitSha(value) {
  return typeof value === 'string' && /^[a-f0-9]{40}$/iu.test(value);
}

async function githubJson(path, accessToken) {
  const response = await fetch(`${GITHUB_API}${path}`, {
    headers: {
      Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2026-03-10', 'User-Agent': USER_AGENT,
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    const error = new Error(response.status === 404 ? 'Repository or revision could not be accessed.' : 'GitHub request failed.');
    error.status = response.status === 401 ? 401 : response.status === 404 ? 404 : response.status === 403
      ? response.headers.get('x-ratelimit-remaining') === '0' ? 429 : 403
      : 502;
    error.retryAfter = response.headers.get('retry-after');
    throw error;
  }
  const reader = response.body?.getReader();
  if (!reader) throw new Error('GitHub returned an empty response.');
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_UPSTREAM_JSON_BYTES) {
      await reader.cancel();
      const error = new Error('GitHub response exceeds the supported size limit.');
      error.status = 502;
      throw error;
    }
    chunks.push(value);
  }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder().decode(body));
}

export async function getRepositoryMetadata(owner, repo, accessToken) {
  if (!isValidRepositoryPart(owner) || !isValidRepositoryPart(repo)) {
    const error = new Error('Invalid repository identifier.');
    error.status = 400;
    throw error;
  }
  const metadata = await githubJson(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`, accessToken);
  if (typeof metadata.default_branch !== 'string' || !metadata.default_branch) throw new Error('GitHub returned invalid repository metadata.');
  return { owner, name: repo, defaultBranch: metadata.default_branch, private: Boolean(metadata.private), remoteUrl: `https://github.com/${owner}/${repo}.git` };
}

export async function importPublicRepository({ owner, repo, ref, accessToken }) {
  if (!isValidRepositoryPart(owner) || !isValidRepositoryPart(repo) || (ref !== undefined && (typeof ref !== 'string' || ref.length > 256 || ref.startsWith('-')))) {
    const error = new Error('Invalid repository or revision.');
    error.status = 400;
    throw error;
  }
  const base = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
  const metadata = await githubJson(base, accessToken);
  if (metadata.private && !accessToken) {
    const error = new Error('Private repositories require GitHub authorization.');
    error.status = 403;
    throw error;
  }
  const requestedRef = ref || metadata.default_branch;
  const commit = await githubJson(`${base}/commits/${encodeURIComponent(requestedRef)}`, accessToken);
  const commitSha = commit.sha;
  if (!isCommitSha(commitSha) || !isCommitSha(commit.commit?.tree?.sha)) throw new Error('GitHub returned an invalid revision.');
  const tree = await githubJson(`${base}/git/trees/${commit.commit.tree.sha}?recursive=1`, accessToken);
  const treeEntries = tree.tree ?? [];
  const unsupportedCount = treeEntries.filter((entry) =>
    (entry.type !== 'blob' && entry.type !== 'tree') || (entry.type === 'blob' && entry.mode === '120000'),
  ).length;
  const entries = treeEntries.slice(0, MAX_TREE_ENTRIES)
    .filter((entry) => (entry.type === 'blob' || entry.type === 'tree') && !(entry.type === 'blob' && entry.mode === '120000'))
    .map((entry) => {
      if (!isSafeRepositoryPath(entry.path)) throw new Error('GitHub returned an invalid repository path.');
      return { path: entry.path, type: entry.type, ...(entry.type === 'blob' && Number.isSafeInteger(entry.size) && entry.size >= 0 ? { size: entry.size } : {}) };
    });
  return {
    owner: metadata.owner.login,
    name: metadata.name,
    private: Boolean(metadata.private),
    defaultBranch: metadata.default_branch,
    ref: requestedRef,
    commitSha,
    truncated: Boolean(tree.truncated) || (tree.tree?.length ?? 0) > MAX_TREE_ENTRIES,
    unsupportedCount,
    entries,
  };
}

export async function fetchPublicRepositoryFile({ owner, repo, path, commitSha, accessToken }) {
  if (!isValidRepositoryPart(owner) || !isValidRepositoryPart(repo) || !isSafeRepositoryPath(path) || !isCommitSha(commitSha)) {
    const error = new Error('Invalid repository path or revision.');
    error.status = 400;
    throw error;
  }
  const encodedPath = path.split('/').map(encodeURIComponent).join('/');
  const file = await githubJson(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodedPath}?ref=${commitSha}`, accessToken);
  if (!file || Array.isArray(file) || file.type !== 'file' || !Number.isSafeInteger(file.size) || file.size < 0 || file.size > MAX_INLINE_BYTES || file.encoding !== 'base64' || typeof file.content !== 'string') {
    const error = new Error('File is unavailable, unsupported, or too large for inline preview.');
    error.status = file?.size > MAX_INLINE_BYTES ? 413 : 400;
    throw error;
  }
  const bytes = Buffer.from(file.content.replace(/\s/gu, ''), 'base64');
  if (bytes.byteLength > MAX_INLINE_BYTES || bytes.includes(0)) {
    const error = new Error('Binary files cannot be previewed.');
    error.status = bytes.byteLength > MAX_INLINE_BYTES ? 413 : 415;
    throw error;
  }
  let content;
  try {
    content = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    const error = new Error('File is not valid UTF-8 text.');
    error.status = 415;
    throw error;
  }
  return { path, commitSha, content, truncated: false };
}
