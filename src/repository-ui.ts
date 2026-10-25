import { buildRepoModel, tinyTsFixture, type RepoFixture } from './repo-model.js';
import { importPublicRepository, parseGitHubRepositoryUrl, RepositoryApiError } from './repository-api.js';
import { AuthApiError, beginGitHubSignIn, getAuthConfig, getSession, listRepositories, signOut as signOutFromApp, type AccessibleRepository } from './auth-api.js';

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
      <div class="repo-auth"><span id="auth-user">Checking sign-in…</span><select id="repo-picker" aria-label="Accessible repositories" hidden><option value="">Your repositories…</option></select><a id="github-install" href="#" target="_blank" rel="noopener noreferrer" hidden>Install app for private repos</a><button id="github-signin" type="button" disabled>Continue with GitHub</button><button id="github-signout" type="button" hidden>Sign out</button><button id="repo-more" type="button" hidden>More</button></div>
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
  const moreRepos = root.querySelector<HTMLButtonElement>('#repo-more')!;
  let fixture: RepoFixture = tinyTsFixture;
  let entries = buildRepoModel(fixture).entries;
  let selectedPath = 'src/index.ts';
  let accessibleRepos: AccessibleRepository[] = [];
  let nextCursor: string | null = null;

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
    root.querySelector('#repo-revision')!.textContent = `${fixture.ref} · ${fixture.commitSha}`;
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
    moreRepos.hidden = true;
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
  };

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
      const page = await listRepositories(nextCursor);
      addRepositoryOptions(page.items);
      nextCursor = page.nextCursor;
      moreRepos.hidden = !nextCursor;
    } catch (error) {
      handleRepositoryListError(error);
    } finally {
      moreRepos.disabled = false;
    }
  });
  repoPicker.addEventListener('change', async () => {
    const repository = accessibleRepos.find((item) => item.id === repoPicker.value);
    if (!repository) return;
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
    try {
      const page = await listRepositories();
      addRepositoryOptions(page.items);
      nextCursor = page.nextCursor;
      moreRepos.hidden = !nextCursor;
      if (!page.items.length) authUser.textContent = `Signed in as ${session.user?.login}; no accessible repositories`;
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
      setStatus(error instanceof RepositoryApiError ? error.message : 'Import failed. Start API with npm run api, then retry.', true);
    } finally {
      submit.disabled = false;
    }
  });

  showFixture();
}
