import { checkoutBranch, createBranch, deleteBranch, getBranches, renameBranch, synchronizeWorkspace, type GitWorkspace } from './workspace-api.js';

export function mountBranchUi(root: HTMLElement, workspace: GitWorkspace): void {
  const panel = document.createElement('div');
  panel.className = 'branch-controls';
  panel.innerHTML = '<label for="branch-picker">Branch</label><select id="branch-picker"></select><button type="button" data-branch-action="create">New</button><button type="button" data-branch-action="rename">Rename</button><button type="button" data-branch-action="delete">Delete</button><button type="button" data-sync="fetch">Fetch</button><button type="button" data-sync="pull">Pull</button><button type="button" data-sync="push">Push</button><span class="branch-status" role="status" aria-live="polite"></span>';
  root.querySelector('.repo-toolbar')?.append(panel);
  const picker = panel.querySelector<HTMLSelectElement>('#branch-picker')!;
  const status = panel.querySelector<HTMLElement>('.branch-status')!;
  const onSpatialBranchRequest = () => {
    picker.focus();
    status.textContent = 'Choose a branch in the keyboard-accessible branch control.';
  };
  window.addEventListener('workspace:branch-request', onSpatialBranchRequest);

  const render = (next: GitWorkspace) => {
    picker.replaceChildren();
    const local = (next.branches ?? []).filter((branch) => branch.kind === 'local');
    const remote = (next.branches ?? []).filter((branch) => branch.kind === 'remote');
    for (const [label, branches] of [['Local', local], ['Remote', remote]] as const) {
      const group = document.createElement('optgroup');
      group.label = label;
      for (const branch of branches) {
        const option = new Option(`${branch.name}${branch.current ? ' (current)' : ''}`, branch.name, branch.current, branch.current);
        group.append(option);
      }
      picker.append(group);
    }
  };

  const refresh = async (message = '') => {
    try {
      const next = await getBranches(workspace.id);
      render(next);
      status.textContent = message || `${next.currentBranch} · ${next.workingTree}`;
      window.dispatchEvent(new CustomEvent('workspace:branch-state', { detail: next }));
    } catch (error) {
      status.textContent = error instanceof Error ? error.message : 'Branch state unavailable.';
    }
  };

  picker.addEventListener('change', async () => {
    const name = picker.value;
    picker.disabled = true;
    await (async () => {
      try {
        await checkoutBranch(workspace.id, name);
        await refresh(`Checked out ${name}.`);
      } catch (error) {
        status.textContent = error instanceof Error ? error.message : 'Branch switch failed.';
        await refresh();
      } finally {
        picker.disabled = false;
      }
    })();
  });

  panel.querySelector('[data-branch-action="create"]')?.addEventListener('click', async () => {
    const name = window.prompt('New branch name');
    if (!name) return;
    try {
      await createBranch(workspace.id, name);
      await refresh(`Created ${name}.`);
    } catch (error) { status.textContent = error instanceof Error ? error.message : 'Branch creation failed.'; }
  });
  panel.querySelector('[data-branch-action="rename"]')?.addEventListener('click', async () => {
    const name = picker.value;
    const newName = window.prompt(`Rename ${name} to`, name);
    if (!newName || newName === name) return;
    try {
      await renameBranch(workspace.id, name, newName);
      await refresh(`Renamed ${name} to ${newName}.`);
    } catch (error) { status.textContent = error instanceof Error ? error.message : 'Branch rename failed.'; }
  });
  panel.querySelector('[data-branch-action="delete"]')?.addEventListener('click', async () => {
    const name = picker.value;
    if (!name || !window.confirm(`Delete local branch ${name}? Git will refuse unmerged work.`)) return;
    try {
      await deleteBranch(workspace.id, name);
      await refresh(`Deleted ${name}.`);
    } catch (error) { status.textContent = error instanceof Error ? error.message : 'Branch deletion failed.'; }
  });
  panel.querySelectorAll<HTMLButtonElement>('[data-sync]').forEach((button) => button.addEventListener('click', async () => {
    const operation = button.dataset.sync as 'fetch' | 'pull' | 'push';
    if ((operation === 'pull' || operation === 'push') && !window.confirm(`${operation[0].toUpperCase()}${operation.slice(1)} ${workspace.currentBranch}? Git will confirm the result.`)) return;
    button.disabled = true;
    status.textContent = `${operation}ing…`;
    try {
      const next = await synchronizeWorkspace(workspace.id, operation);
      render(next);
      status.textContent = `${operation} complete · ${next.currentBranch} · ${next.sync.ahead} ahead · ${next.sync.behind} behind`;
      window.dispatchEvent(new CustomEvent('workspace:branch-state', { detail: next }));
    } catch (error) {
      status.textContent = error instanceof Error ? error.message : `${operation} failed.`;
    } finally {
      button.disabled = false;
    }
  }));
  void refresh();
}
