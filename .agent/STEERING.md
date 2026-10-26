# Critical Steering Work

**GitHub 3D steering status: TASK-14 and TASK-15 remain open.** The 2D Git workflows have local automated coverage, but interactive managed-workspace consistency, WebGL fallback, and representative performance evidence are still missing. Do not mark the release gate complete or claim desktop-client parity until those checks are done.

Use the repository’s live specs and scripts:
- run Ralph through Docker Sandboxes (`sbx`) only;
- follow `.agent/PROMPT.md` through the full set of incomplete tasks requested by the user; do not stop after a single task;
- use Bun-only project commands from `AGENTS.md` and `package.json`.
