import { getWorkspaceChanges, getWorkspaceDiff, type WorkspaceChange } from './change-api.js';

export function mountChangeReview(root: HTMLElement, workspaceId: string): void {
  const panel = document.createElement('section');
  panel.className = 'change-review';
  panel.innerHTML = '<h2>Working tree</h2><div class="change-summary" role="status" aria-live="polite"></div><div class="change-list"></div><pre class="change-diff" aria-label="Selected Git diff">Select a changed file.</pre>';
  root.querySelector('.repo-browser')?.prepend(panel);
  const summary = panel.querySelector<HTMLElement>('.change-summary')!;
  const list = panel.querySelector<HTMLElement>('.change-list')!;
  const diff = panel.querySelector<HTMLElement>('.change-diff')!;
  const render = (changes: WorkspaceChange[]) => {
    list.replaceChildren();
    summary.textContent = changes.length ? `${changes.length} changed file${changes.length === 1 ? '' : 's'}` : 'Working tree clean.';
    for (const change of changes) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'change-row';
      button.textContent = `${change.kind} - ${change.path}`;
      button.addEventListener('click', async () => {
        list.querySelectorAll('button').forEach((item) => item.setAttribute('aria-current', String(item === button)));
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
      list.append(button);
    }
  };

  const describe = (value: Awaited<ReturnType<typeof getWorkspaceDiff>>) => {
    if (value.binary) return '[Binary content; text diff not rendered]';
    if (value.unsupported) return '[Unsupported content; text diff not rendered]';
    if (value.truncated) return `${value.patch}\n[Large diff truncated]`;
    return value.patch || '[No textual changes]';
  };

  void getWorkspaceChanges(workspaceId).then(({ changes }) => render(changes)).catch((error) => { summary.textContent = error instanceof Error ? error.message : 'Change review unavailable.'; });
}
