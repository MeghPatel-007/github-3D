# GitHub 3D — Project Summary

## Product mission

Build a fully working, GitHub Desktop-style Git client with a 3D repository world as its primary workspace. Users should be able to sign in, open or clone a repository, work with branches and file changes, review and stage diffs, commit, fetch, pull, push, recover from conflicts, inspect history, and open related GitHub context. The 3D world must make repository structure and Git state easier to understand; precise operations must also remain available through synchronized 2D controls and keyboard input.

GitHub 3D is an independent product and should not claim exact feature parity until the capability matrix in `docs/25-implementation-task-breakdown.md` is implemented and verified. GitHub remains the remote source of truth. The local or managed Git workspace is authoritative for uncommitted changes. Do not simulate Git actions or report success until the Git engine confirms them.

## Current state

The current application is an early repository explorer: it has a local `tiny-ts` fixture, public repository import through the API, synchronized tree selection, bounded source preview, and basic JavaScript/TypeScript import display. It is not yet a complete Git client. Secure production authentication, clone/open lifecycle, branch operations, working-tree status, diff/staging, commits, remote sync, conflict recovery, history, full 3D operation coverage, and production deployment remain roadmap work.

## Source-of-truth specs

- Product and user journey: `docs/01-product-requirements.md`
- Architecture and trust boundaries: `docs/02-system-architecture.md`, `docs/03-authentication-and-security.md`
- Repository import and data contracts: `docs/04-repository-data-and-api.md`, `docs/19-api-contracts.md`
- 3D experience and interaction: `docs/05-three-d-world-and-interactions.md`, `docs/13-camera-controls-and-input.md`, `docs/15-state-management-and-interaction-contracts.md`
- Visual and experience design: `docs/design/design.md`, `docs/20-design-system-and-ui-components.md`, `docs/17-accessibility-responsive-and-motion.md`
- Milestones and acceptance: `docs/08-implementation-plan.md`, `docs/09-testing-and-acceptance.md`, `docs/25-implementation-task-breakdown.md`

Keep imported data tied to its resolved commit SHA, keep credentials and sessions server-side, render repository source as text, and describe unsupported or incomplete analysis honestly.
