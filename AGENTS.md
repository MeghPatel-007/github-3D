# Code Quality Standards

## Package manager

Use **Bun only** for package management and project scripts. Use `bun install`, `bun run <script>`, and `bunx` for package executables. Never use npm, npx, pnpm, or Yarn. `bun.lock` is authoritative; do not update the legacy `package-lock.json`.

Always apply these standards to all code you write.

For Ralph's Docker Sandboxes naming conventions (per-agent + per-project, used at startup and during cleanup), see @RALPH.md.

## Reuse Before Creating

Before writing new code, analyze existing utilities, components, hooks, helpers and tests:

1. **Search first** — grep/glob for similar functionality before implementing
2. **Extend if close** — if something exists that's 80% of what you need, extend it
3. **Extract if duplicating** — if you're about to copy-paste, extract to shared module instead

## File Size & Organization

Keep files between **200-300 lines max**. If a file exceeds this:

1. **Split by responsibility** — one module = one concern
2. **Extract sub-components** — UI pieces that can stand alone should
3. **Separate logic from presentation** — hooks/utils in their own files
4. **Group by feature** — co-locate related files, not by type

Signs a file needs splitting:
- Multiple unrelated exports
- Scrolling to find what you need
- "Utils" file becoming a junk drawer
- Component doing data fetching + transformation + rendering

## Task Execution

- **Complete the user's full requested outcome.** Work through every required step and subtask before stopping; do not stop after the first item in a multi-part request.
- When the user asks to finish the indexed work in `.agent/tasks.json`, process every incomplete task in dependency order, updating each task's status and log only after its acceptance criteria pass. Stop after all requested tasks are complete, or when a genuine blocker or required user decision prevents further progress.
- Keep changes for separate indexed tasks isolated and verifiable. Do not claim the overall request is complete while requested tasks remain unfinished.

## Code Style

1. Prefer writing clear code and use inline comments sparingly
2. Document methods with block comments at the top of the method
3. Use Conventional Commit format

## Test To Verify Functionality

If you didn't test it, it doesn't work.

Verify written code by:
- Running unit tests
- Running end to end tests
- Checking for type errors
- Checking for lint errors
- Smoke testing and checking for runtime errors with Playwright
- Taking screenshots and verifying the UI is as expected
