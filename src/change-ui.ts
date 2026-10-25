import { getWorkspaceChanges, getWorkspaceDiff, mutateWorkspaceChanges, type ChangeOperation, type WorkspaceChange } from './change-api.js';
import { commitWorkspace } from './workspace-api.js';

export function mountChangeReview(root: HTMLElement, workspaceId: string): void {
  const panel = document.createElement('section');
  panel.className = 'change-review';
  panel.innerHTML = '<h2>Working tree</h2><div class="change-summary" role="status" aria-live="polite"></div><form class="commit-form"><label>Commit message<input name="message" required maxlength="5000"></label><label>Author name<input name="authorName" required maxlength="200"></label><label>Author email<input name="authorEmail" type="email" required maxlength="320"></label><button type="submit">Commit staged changes</button></form><div class="change-list"></div><pre class="change-diff" aria-label="Selected Git diff">Select a changed file.</pre>';
  root.querySelector('.repo-browser')?.prepend(panel);
  const summary = panel.querySelector<HTMLElement>('.change-summary')!;
  const list = panel.querySelector<HTMLElement>('.change-list')!;
  const diff = panel.querySelector<HTMLElement>('.change-diff')!;
  const commitForm = panel.querySelector<HTMLFormElement>('.commit-form')!;
  const commitMessage = commitForm.elements.namedItem('message') as HTMLInputElement;
  const commitAuthorName = commitForm.elements.namedItem('authorName') as HTMLInputElement;
  const commitAuthorEmail = commitForm.elements.namedItem('authorEmail') as HTMLInputElement;
  const commitButton = commitForm.querySelector<HTMLButtonElement>('button')!;
  const refresh = async () => {
    const result = await getWorkspaceChanges(workspaceId);
    render(result.changes);
  };
  const render = (changes: WorkspaceChange[]) => {
    list.replaceChildren();
    const staged = changes.filter((change) => change.staged).length;
    const unstaged = changes.filter((change) => change.unstaged).length;
    summary.textContent = changes.length ? `${changes.length} changed file${changes.length === 1 ? '' : 's'} · ${staged} staged · ${unstaged} unstaged` : 'Working tree clean.';
    commitButton.disabled = staged === 0;
    for (const change of changes) {
      const row = document.createElement('div');
      row.className = 'change-entry';
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'change-row';
      button.textContent = `${change.kind} - ${change.path}`;
      button.addEventListener('click', async () => {
        list.querySelectorAll('.change-row').forEach((item) => item.setAttribute('aria-current', String(item === button)));
        window.dispatchEvent(new CustomEvent('repo:select', { detail: change.path }));
        diff.textContent = 'Loading Git diff...';
        try {
          const [stagedDiff, unstagedDiff] = await Promise.all([
            change.staged ? getWorkspaceDiff(workspaceId, change.path, true) : Promise.resolve(null),
            change.unstaged ? getWorkspaceDiff(workspaceId, change.path, false) : Promise.resolve(null),
          ]);
          const sections = [stagedDiff && `STAGED\n${describe(stagedDiff)}`, unstagedDiff && `UNSTAGED\n${describe(unstagedDiff)}`].filter(Boolean);
          diff.textContent = sections.join('\n\n') || 'No diff available. Refresh the review.';
        } catch (error) {
          diff.textContent = error instanceof Error ? error.message : 'Diff unavailable.';
        }
      });
      row.append(button);
      const addAction = (label: string, operation: ChangeOperation) => {
        const action = document.createElement('button');
        action.type = 'button';
        action.className = 'change-action';
        action.textContent = label;
        action.disabled = operation === 'stage' ? !change.unstaged : operation === 'unstage' ? !change.staged : false;
        action.addEventListener('click', async () => {
          const paths = [change.path];
          if (operation === 'discard' && !window.confirm(`Discard changes to ${paths.join(', ')}? This cannot be undone.`)) return;
          action.disabled = true;
          summary.textContent = `${operation}ing ${paths.join(', ')}…`;
          try {
            await mutateWorkspaceChanges(workspaceId, operation, paths, operation === 'discard' ? paths : undefined);
            await refresh();
          } catch (error) {
            summary.textContent = error instanceof Error ? error.message : 'Git change operation failed.';
            await refresh().catch(() => undefined);
          }
        });
        row.append(action);
      };
      addAction('Stage', 'stage');
      addAction('Unstage', 'unstage');
      addAction('Discard', 'discard');
      list.append(row);
    }
  };

  commitForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    commitButton.disabled = true;
    summary.textContent = 'Creating commit…';
    try {
      const result = await commitWorkspace(workspaceId, commitMessage.value, commitAuthorName.value, commitAuthorEmail.value);
      window.dispatchEvent(new CustomEvent('workspace:branch-state', { detail: result }));
      commitMessage.value = '';
      render(result.changes);
      summary.textContent = `Committed ${result.commit.sha.slice(0, 7)} · ${result.commit.message}`;
    } catch (error) {
      summary.textContent = error instanceof Error ? error.message : 'Commit failed.';
      await refresh().catch(() => undefined);
    }
  });

  const describe = (value: Awaited<ReturnType<typeof getWorkspaceDiff>>) => {
    if (value.binary) return '[Binary content; text diff not rendered]';
    if (value.unsupported) return '[Unsupported content; text diff not rendered]';
    if (value.truncated) return `${value.patch}\n[Large diff truncated]`;
    return value.patch || '[No textual changes]';
  };

  void refresh().catch((error) => { summary.textContent = error instanceof Error ? error.message : 'Change review unavailable.'; });
}
