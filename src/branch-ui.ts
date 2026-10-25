import { checkoutBranch, createBranch, deleteBranch, getBranches, renameBranch, type GitWorkspace } from './workspace-api.js';

export function mountBranchUi(root: HTMLElement, workspace: GitWorkspace): void {
  const panel = document.createElement('div');
  panel.className = 'branch-controls';
  panel.innerHTML = '<label for="branch-picker">Branch</label><select id="branch-picker"></select><button type="button" data-branch-action="create">New</button><button type="button" data-branch-action="rename">Rename</button><button type="button" data-branch-action="delete">Delete</button><span class="branch-status" role="status" aria-live="polite"></span>';
  root.querySelector('.repo-toolbar')?.append(panel);
  const picker = panel.querySelector<HTMLSelectElement>('#branch-picker')!;
  const status = panel.querySelector<HTMLElement>('.branch-status')!;

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
  void refresh();
}
