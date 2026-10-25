import { buildRepoModel, tinyTsFixture, type RepoFixture } from './repo-model.js';
import { importPublicRepository, parseGitHubRepositoryUrl, RepositoryApiError } from './repository-api.js';
import { AuthApiError, beginGitHubSignIn, getAuthConfig, getSession, listRepositories, signOut as signOutFromApp, type AccessibleRepository } from './auth-api.js';
import { openWorkspace } from './workspace-api.js';
import { mountBranchUi } from './branch-ui.js';
import { mountChangeReview } from './change-ui.js';

export function mountRepositoryUi(): void {
  const root = document.querySelector<HTMLElement>('#app-root');
  if (!root) return;
  root.innerHTML = `
    <header class="repo-toolbar">
      <div class="repo-brand">GitHub 3D</div>
      <form class="repo-form" id="repo-form">
        <label class="sr-only" for="repo-url">Public GitHub repository URL</label>
        <input id="repo-url" type="url" placeholder="https://github.com/owner/repository" autocomplete="url" required>
        <button id="repo-submit" type="submit" disabled>Import public repo</button>
      </form>
       <div class="repo-auth"><span id="auth-user">Checking sign-in…</span><input id="repo-auth-search" type="search" placeholder="Search your repositories…" aria-label="Search accessible repositories" hidden><select id="repo-picker" aria-label="Accessible repositories" hidden><option value="">Your repositories…</option></select><button id="workspace-open" type="button" hidden>Open workspace</button><button id="workspace-clone" type="button" hidden>Clone workspace</button><button id="workspace-init" type="button" hidden>Initialize workspace</button><a id="github-install" href="#" target="_blank" rel="noopener noreferrer" hidden>Install app for private repos</a><button id="github-signin" type="button" disabled>Continue with GitHub</button><button id="github-signout" type="button" hidden>Sign out</button><button id="repo-more" type="button" hidden>More</button><button id="repo-retry" type="button" hidden>Retry repository search</button></div>
      <div id="repo-status" class="repo-status" role="status" aria-live="polite">Loading demo repository…</div>
    </header>
    <aside class="repo-browser" aria-label="Repository file browser">
      <div class="repo-heading"><strong id="repo-name">tiny-ts</strong><code id="repo-revision"></code></div>
      <label class="sr-only" for="repo-search">Search repository paths</label>
      <input id="repo-search" class="repo-search" type="search" placeholder="Search paths…">
      <nav id="repo-file-list" class="repo-file-list" aria-label="Repository files"></nav>
      <div class="repo-hint">Select a path to open its inspector. The world shows up to 500 nodes; all paths remain searchable. Public repositories only.</div>
    </aside>`;

  const form = root.querySelector<HTMLFormElement>('#repo-form')!;
  const input = root.querySelector<HTMLInputElement>('#repo-url')!;
  const submit = root.querySelector<HTMLButtonElement>('#repo-submit')!;
  const status = root.querySelector<HTMLElement>('#repo-status')!;
  const search = root.querySelector<HTMLInputElement>('#repo-search')!;
  const list = root.querySelector<HTMLElement>('#repo-file-list')!;
  const authUser = root.querySelector<HTMLElement>('#auth-user')!;
  const signIn = root.querySelector<HTMLButtonElement>('#github-signin')!;
  const signOutButton = root.querySelector<HTMLButtonElement>('#github-signout')!;
  const installLink = root.querySelector<HTMLAnchorElement>('#github-install')!;
  const repoPicker = root.querySelector<HTMLSelectElement>('#repo-picker')!;
  const repoAuthSearch = root.querySelector<HTMLInputElement>('#repo-auth-search')!;
  const moreRepos = root.querySelector<HTMLButtonElement>('#repo-more')!;
  const retryRepos = root.querySelector<HTMLButtonElement>('#repo-retry')!;
  const workspaceButtons = ['#workspace-open', '#workspace-clone', '#workspace-init'].map((selector) => root.querySelector<HTMLButtonElement>(selector)!);
  let fixture: RepoFixture = tinyTsFixture;
  let entries = buildRepoModel(fixture).entries;
  let selectedPath = 'src/index.ts';
  let accessibleRepos: AccessibleRepository[] = [];
  let nextCursor: string | null = null;
  let repositorySearchRequest = 0;

  const setWorkspaceButtons = (visible: boolean, disabled = false) => workspaceButtons.forEach((button) => { button.hidden = !visible; button.disabled = disabled; });

  const setStatus = (text: string, error = false) => {
    status.textContent = text;
    status.dataset.error = String(error);
  };

  const drawList = () => {
    list.replaceChildren();
    const query = search.value.trim().toLowerCase();
    const matches = entries.filter((entry) => !query || entry.path.toLowerCase().includes(query));
    const visible = matches.slice(0, 200);
    for (const entry of visible) {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.path = entry.path;
      button.setAttribute('aria-current', String(entry.path === selectedPath));
      button.style.paddingLeft = `${9 + entry.path.split('/').length * 12}px`;
      button.textContent = `${entry.type === 'tree' ? '▰' : '▫'} ${entry.path}`;
      button.addEventListener('click', () => {
        selectedPath = entry.path;
        drawList();
        window.dispatchEvent(new CustomEvent('repo:select', { detail: entry.path }));
      });
      list.append(button);
    }
    if (!visible.length) list.textContent = 'No matching repository paths.';
    if (matches.length > visible.length) {
      const more = document.createElement('p');
      more.className = 'repo-empty';
      more.textContent = `Showing first ${visible.length} matches. Refine search to find other paths.`;
      list.append(more);
    }
  };

  const showFixture = () => {
    root.querySelector('#repo-name')!.textContent = `${fixture.owner}/${fixture.name} · demo`;
    root.querySelector('#repo-revision')!.textContent = `${fixture.ref ?? fixture.defaultBranch} · revision ${fixture.commitSha}`;
    drawList();
  };

  const clearPrivateRepository = () => {
    if (!fixture.private) return;
    fixture = tinyTsFixture;
    entries = buildRepoModel(fixture).entries;
    selectedPath = 'src/index.ts';
    showFixture();
    window.dispatchEvent(new CustomEvent('repo:load', { detail: fixture }));
  };

  const applyImportedRepository = (imported: Awaited<ReturnType<typeof importPublicRepository>>) => {
    fixture = { ...imported, id: `${imported.owner}/${imported.name}`, owner: imported.owner, contents: {} };
    entries = buildRepoModel(fixture).entries;
    selectedPath = '';
    window.dispatchEvent(new CustomEvent('repo:load', { detail: fixture }));
    root.querySelector('#repo-name')!.textContent = `${fixture.owner}/${fixture.name}`;
    root.querySelector('#repo-revision')!.textContent = `${fixture.ref ?? fixture.defaultBranch} · revision ${fixture.commitSha}`;
    drawList();
    const sceneNotice = imported.entries.length > 500 ? ' World view is limited to 500 nodes.' : '';
    const incompleteNotice = imported.truncated ? ' GitHub marked the tree truncated.' : '';
    const unsupportedNotice = imported.unsupportedCount ? ` Skipped ${imported.unsupportedCount} symlink or unsupported entries.` : '';
    setStatus(`Imported ${imported.entries.length} tree entries.${incompleteNotice}${unsupportedNotice}${sceneNotice}`);
  };

  const addRepositoryOptions = (repositories: AccessibleRepository[]) => {
    for (const repository of repositories) {
      accessibleRepos.push(repository);
      const option = document.createElement('option');
      option.value = repository.id;
      option.textContent = `${repository.fullName}${repository.private ? ' · private' : ''}`;
      repoPicker.append(option);
    }
  };

  const showSignedOut = () => {
    signIn.hidden = false;
    signOutButton.hidden = true;
    repoPicker.hidden = true;
    repoAuthSearch.hidden = true;
    moreRepos.hidden = true;
    retryRepos.hidden = true;
    setWorkspaceButtons(false);
    authUser.textContent = 'GitHub session expired. Sign in again.';
    accessibleRepos = [];
    repoPicker.replaceChildren(new Option('Your repositories…', ''));
    clearPrivateRepository();
  };

  const handleRepositoryListError = (error: unknown) => {
    if (error instanceof AuthApiError && error.status === 401) {
      showSignedOut();
    }
    setStatus(error instanceof Error ? error.message : 'Could not load GitHub repositories.', true);
    retryRepos.hidden = false;
  };

  const loadRepositoryPage = async (cursor?: string, replace = false): Promise<number> => {
    const page = await listRepositories(cursor, repoAuthSearch.value);
    if (replace) {
      accessibleRepos = [];
      repoPicker.replaceChildren(new Option('Your repositories…', ''));
    }
    addRepositoryOptions(page.items);
    nextCursor = page.nextCursor;
    moreRepos.hidden = !nextCursor;
    retryRepos.hidden = true;
    if (!page.items.length && replace) setStatus('No accessible repositories match that search.');
    else if (replace) setStatus(`Found ${page.items.length} accessible repositories.`);
    return page.items.length;
  };

  retryRepos.addEventListener('click', async () => {
    retryRepos.disabled = true;
    try {
      await loadRepositoryPage(undefined, true);
    } catch (error) {
      handleRepositoryListError(error);
    } finally {
      retryRepos.disabled = false;
    }
  });

  search.addEventListener('input', drawList);
  window.addEventListener('repo:system-ready', () => {
    submit.disabled = false;
    setStatus('Offline demo ready.');
  }, { once: true });
  window.addEventListener('repo:selected', (event) => {
    selectedPath = (event as CustomEvent<string>).detail;
    list.querySelectorAll<HTMLButtonElement>('button[data-path]').forEach((button) => {
      button.setAttribute('aria-current', String(button.dataset.path === selectedPath));
    });
  });
  window.addEventListener('repo:auth-expired', showSignedOut);

  signIn.addEventListener('click', beginGitHubSignIn);
  signOutButton.addEventListener('click', async () => {
    signOutButton.disabled = true;
    try {
      await signOutFromApp();
      window.location.reload();
    } catch {
      setStatus('Sign-out failed. Retry.', true);
      signOutButton.disabled = false;
    }
  });
  moreRepos.addEventListener('click', async () => {
    if (!nextCursor) return;
    moreRepos.disabled = true;
    try {
      await loadRepositoryPage(nextCursor);
    } catch (error) {
      handleRepositoryListError(error);
    } finally {
      moreRepos.disabled = false;
    }
  });
  repoAuthSearch.addEventListener('input', async () => {
    const requestId = ++repositorySearchRequest;
    repoPicker.disabled = true;
    moreRepos.disabled = true;
    accessibleRepos = [];
    repoPicker.replaceChildren(new Option('Searching repositories…', ''));
    setStatus('Searching authorized repositories…');
    try {
      const page = await listRepositories(undefined, repoAuthSearch.value);
      if (requestId !== repositorySearchRequest) return;
      addRepositoryOptions(page.items);
      nextCursor = page.nextCursor;
      moreRepos.hidden = !nextCursor;
      retryRepos.hidden = true;
      if (!page.items.length) setStatus('No accessible repositories match that search.');
      else setStatus(`Found ${page.items.length} accessible repositories.`);
    } catch (error) {
      if (requestId === repositorySearchRequest) handleRepositoryListError(error);
    } finally {
      if (requestId === repositorySearchRequest) {
        repoPicker.disabled = false;
        moreRepos.disabled = false;
      }
    }
  });
  repoPicker.addEventListener('change', async () => {
    const repository = accessibleRepos.find((item) => item.id === repoPicker.value);
    if (!repository) return;
    setWorkspaceButtons(true);
    repoPicker.disabled = true;
    try {
      applyImportedRepository(await importPublicRepository(repository.owner, repository.name, repository.defaultBranch));
    } catch (error) {
      if (error instanceof RepositoryApiError && error.status === 401) showSignedOut();
      setStatus(error instanceof Error ? error.message : 'Repository import failed.', true);
    } finally {
      repoPicker.disabled = false;
    }
  });

  workspaceButtons.forEach((button, index) => button.addEventListener('click', async () => {
    const repository = accessibleRepos.find((item) => item.id === repoPicker.value);
    if (!repository) return;
    setWorkspaceButtons(true, true);
    const action = (['open', 'clone', 'init'] as const)[index];
    setStatus(`${action === 'clone' ? 'Cloning' : action === 'init' ? 'Initializing' : 'Opening'} workspace…`);
    try {
      const workspace = await openWorkspace(repository.owner, repository.name, action);
      setStatus(`${workspace.repository.owner}/${workspace.repository.name} · ${workspace.currentBranch} · ${workspace.workingTree} · HEAD ${workspace.headSha ?? 'unborn'}`);
      mountBranchUi(root, workspace);
      root.querySelector('.change-review')?.remove();
      mountChangeReview(root, workspace.id);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Workspace operation failed.', true);
    } finally {
      setWorkspaceButtons(true);
    }
  }));

  void Promise.all([getAuthConfig(), getSession()]).then(async ([config, session]) => {
    installLink.hidden = !config.installUrl;
    if (config.installUrl) installLink.href = config.installUrl;
    signIn.disabled = !config.configured;
    signIn.hidden = session.authenticated;
    signOutButton.hidden = !session.authenticated;
    authUser.textContent = session.authenticated
      ? `Signed in as ${session.user?.login}`
      : config.configured ? 'Not signed in' : 'GitHub sign-in not configured';
    if (!session.authenticated) return;
    repoPicker.hidden = false;
    repoAuthSearch.hidden = false;
    try {
      const repositoryCount = await loadRepositoryPage(undefined, true);
      if (!repositoryCount) authUser.textContent = `Signed in as ${session.user?.login}; no accessible repositories`;
    } catch (error) {
      handleRepositoryListError(error);
    }
  }).catch((error) => {
    authUser.textContent = 'Sign-in service unavailable';
    setStatus(error instanceof Error ? error.message : 'Could not load GitHub session.', true);
  });

  if (new URLSearchParams(location.search).get('auth') === 'denied') {
    setStatus('GitHub authorization was cancelled.', true);
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const parsed = parseGitHubRepositoryUrl(input.value);
    if (!parsed) {
      setStatus('Enter a GitHub URL in https://github.com/owner/repository format.', true);
      return;
    }
    submit.disabled = true;
    setStatus('Resolving repository revision and tree…');
    try {
      const imported = await importPublicRepository(parsed.owner, parsed.repo);
      applyImportedRepository(imported);
    } catch (error) {
      if (error instanceof RepositoryApiError && error.status === 401) showSignedOut();
      setStatus(error instanceof RepositoryApiError ? error.message : 'Import failed. Start API with bun run api, then retry.', true);
    } finally {
      submit.disabled = false;
    }
  });

  showFixture();
}
