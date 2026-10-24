# Project Agent Skills

This is the project skill index for agents working on GitHub 3D. Skills are reusable task workflows, not general product requirements. Read the selected skill's `SKILL.md` before applying it; this index helps choose the right one.

## How to use this index

1. Read the root [`AGENTS.md`](../AGENTS.md), this index, and the spec documents related to the task. Read any nested instructions governing files you will change.
2. For any request that builds, extends, fixes, tunes, or polishes the IWSDK app, start with **`iwsdk-dev`**. It routes the work to exactly one internal planning or iteration playbook. Follow that route before selecting a specialist.
3. Load only the specialist skill whose scope matches the requested change or verification. Its procedure takes precedence over this summary.
4. Combine skills only where the work crosses their boundaries; follow the combinations below.
5. Report the evidence actually gathered. Do not claim runtime, XR, or headset behavior based only on source inspection or an editor preview.

The project has 12 distinct skill workflows, each available under both [`.agents/skills/`](../.agents/skills/) and [`.claude/skills/`](../.claude/skills/). The two folders contain harness-specific copies of the same named skills, not 24 separate workflows. Consult the relevant copy's references when its instructions route you there.

## Skill catalog

| Skill | Use it for | Path |
|---|---|---|
| `iwsdk-dev` | Entry point for every IWSDK app implementation request. Chooses the planner path for a fresh/replacement experience or the iterate path for a bounded change to an established experience. | [`.agents`](../.agents/skills/iwsdk-dev/SKILL.md) · [`.claude`](../.claude/skills/iwsdk-dev/SKILL.md) |
| `iwsdk-build-model` | Creating or materially repairing one reusable glTF or procedural 3D model: geometry, materials, semantic hierarchy, proportions, model-local detail, and isolated inspection. | [`.agents`](../.agents/skills/iwsdk-build-model/SKILL.md) · [`.claude`](../.claude/skills/iwsdk-build-model/SKILL.md) |
| `iwsdk-compose-scene` | Composing or reviewing a scene from existing manifest assets: scene JSON, placement, scale, contacts, prefabs, patterns, lighting, environment, cameras, and framing. | [`.agents`](../.agents/skills/iwsdk-compose-scene/SKILL.md) · [`.claude`](../.claude/skills/iwsdk-compose-scene/SKILL.md) |
| `iwsdk-ui` | Building or modifying manifest-backed UIKitML, spatial panels, browser HUDs, fonts, editor previews, placement, or runtime UI behavior. | [`.agents`](../.agents/skills/iwsdk-ui/SKILL.md) · [`.claude`](../.claude/skills/iwsdk-ui/SKILL.md) |
| `iwsdk-physics` | Adding or repairing rigid-body simulation, collision shapes, forces, gravity, falling, bouncing, kinematic movement, or physics-aware grabbing. | [`.agents`](../.agents/skills/iwsdk-physics/SKILL.md) · [`.claude`](../.claude/skills/iwsdk-physics/SKILL.md) |
| `iwsdk-depth-occlusion` | Implementing or repairing WebXR depth sensing and real-world AR occlusion, including `DepthSensingSystem`, `DepthOccludable`, and occlusion modes. | [`.agents`](../.agents/skills/iwsdk-depth-occlusion/SKILL.md) · [`.claude`](../.claude/skills/iwsdk-depth-occlusion/SKILL.md) |
| `iwsdk-grab` | Verifying near-hand pickup, movement, and release for `OneHandGrabbable` or `TwoHandsGrabbable` with emulated XR controllers. | [`.agents`](../.agents/skills/iwsdk-grab/SKILL.md) · [`.claude`](../.claude/skills/iwsdk-grab/SKILL.md) |
| `iwsdk-ray` | Verifying ray clicks, UIKit selection, pointing, and `DistanceGrabbable` interactions with emulated XR controllers. | [`.agents`](../.agents/skills/iwsdk-ray/SKILL.md) · [`.claude`](../.claude/skills/iwsdk-ray/SKILL.md) |
| `iwsdk-debug` | Diagnosing live runtime behavior such as physics, animation, collision, interaction, or state using bounded ECS pause/query/snapshot/step/diff evidence. | [`.agents`](../.agents/skills/iwsdk-debug/SKILL.md) · [`.claude`](../.claude/skills/iwsdk-debug/SKILL.md) |
| `iwsdk-native-xr-test` | Testing or debugging on a connected Quest in a real immersive session with the IWSDK CLI and an explicit device serial. | [`.agents`](../.agents/skills/iwsdk-native-xr-test/SKILL.md) · [`.claude`](../.claude/skills/iwsdk-native-xr-test/SKILL.md) |
| `iwsdk-hosting` | Choosing or publishing public HTTPS hosting for the app. Its workflow first establishes whether hosting already exists. | [`.agents`](../.agents/skills/iwsdk-hosting/SKILL.md) · [`.claude`](../.claude/skills/iwsdk-hosting/SKILL.md) |
| `iwsdk-pwa-packaging` | PWA/TWA setup and Quest/Horizon Store packaging: web manifest and icons, Bubblewrap, signing, Digital Asset Links, sideloading, store upload, and packaged-app launch problems. | [`.agents`](../.agents/skills/iwsdk-pwa-packaging/SKILL.md) · [`.claude`](../.claude/skills/iwsdk-pwa-packaging/SKILL.md) |

## Related project agent (not a skill)

The repository also defines a Claude code-review agent. It performs IWSDK-focused reviews, especially for framework usage, ECS patterns, performance, and unexplained build/runtime failures. Use it for review requests or when a failure remains unexplained after implementation; it is a distinct agent definition, not another skill workflow.

- [`iwsdk-project-code-reviewer`](../.claude/agents/iwsdk-project-code-reviewer.md)

The `.claude/rules/`, `.cursor/rules/`, and `.github/instructions/` folders contain scoped instructions. They are not designated skills, but agents must follow the applicable rules for the files they edit. No additional `SKILL.md` definitions were found in those folders or in `.codex/`.

## Routing and combinations

- **Any app implementation:** `iwsdk-dev` first. Do not skip its route or load both internal playbooks.
- **New or repaired model plus a scene:** complete each model and manifest registration with `iwsdk-build-model`, then arrange it with `iwsdk-compose-scene`.
- **A scene contains a model defect:** route the model-local repair to `iwsdk-build-model`; keep placement, lighting, camera, and composition work in `iwsdk-compose-scene`.
- **UIKitML or spatial UI:** use `iwsdk-ui`; do not treat UI as model geometry or scene decoration.
- **Physics or interaction behavior:** use `iwsdk-physics` for simulation/collision implementation. Use `iwsdk-grab` or `iwsdk-ray` when the task specifically asks to verify those interactions. Use `iwsdk-debug` when a runtime state change needs ECS evidence.
- **XR platform verification:** use `iwsdk-native-xr-test` only when the user asks for a real Quest test. Emulated-controller checks are covered by `iwsdk-grab` and `iwsdk-ray`.
- **Release pipeline:** use `iwsdk-hosting` for the public origin and `iwsdk-pwa-packaging` for installability/APK/Store steps. Packaging depends on a live HTTPS origin; follow the packaging skill's order.
- Do not load a specialist merely because a task mentions XR. Match the skill scope to the actual change or evidence requested.

## Web authentication and Better Auth

There is no project-specific authentication or Better Auth skill. For login, signup, OAuth, or session work, use the product specs as the source of requirements and consult current official Better Auth and provider documentation when implementing. Read:

- [`03-authentication-and-security.md`](03-authentication-and-security.md)
- [`02-system-architecture.md`](02-system-architecture.md)
- [`09-testing-and-acceptance.md`](09-testing-and-acceptance.md)
- [`10-decisions-and-open-questions.md`](10-decisions-and-open-questions.md)

The current product contract is GitHub sign-in with a secure app session; it does not require email/password signup or prescribe Better Auth. A first-time GitHub sign-in can establish the app's user record. Preserve the documented trust boundaries: secrets and privileged tokens remain server-side, sessions use secure cookies, protected repository requests verify access, permissions stay minimal/read-only, and logout, expiry, revocation, denial, and insufficient-permission states are handled. Inspect the actual IWSDK/Vite app and deployment structure before choosing where the auth server runs.

## Project-wide reminders

- `iwsdk.config.json` is the authority for the active scene, asset/component modules, and world features; `vite.config.ts` only wires the plugin.
- Import Three.js from `@iwsdk/core`, never directly from `three` (except the documented type-only GLTF import).
- Static geometry belongs in model assets; scene JSON composes manifest IDs.
- Run `bun run --if-present typecheck` before runtime testing, as required by the root project instructions.
- Use runtime evidence for behavior driven by application systems. An editor screenshot does not run those systems; pose and interaction claims require an active XR session.

## Spec navigation

| Work area | Read first |
|---|---|
| Product scope or user journey | [`01-product-requirements.md`](01-product-requirements.md), [`10-decisions-and-open-questions.md`](10-decisions-and-open-questions.md) |
| Authentication, sessions, or permissions | [`03-authentication-and-security.md`](03-authentication-and-security.md), [`02-system-architecture.md`](02-system-architecture.md), [`09-testing-and-acceptance.md`](09-testing-and-acceptance.md) |
| GitHub API, repository import, content, or caching | [`04-repository-data-and-api.md`](04-repository-data-and-api.md), [`03-authentication-and-security.md`](03-authentication-and-security.md) |
| 3D world and navigation | [`05-three-d-world-and-interactions.md`](05-three-d-world-and-interactions.md), [`01-product-requirements.md`](01-product-requirements.md) |
| Dependency analysis | [`06-code-analysis-and-dependencies.md`](06-code-analysis-and-dependencies.md), [`04-repository-data-and-api.md`](04-repository-data-and-api.md) |
| Commit history or revision comparisons | [`07-commit-history.md`](07-commit-history.md), [`04-repository-data-and-api.md`](04-repository-data-and-api.md) |
| Milestones and completion criteria | [`08-implementation-plan.md`](08-implementation-plan.md), [`09-testing-and-acceptance.md`](09-testing-and-acceptance.md) |

## Closeout

When handing work back, summarize the files or behavior changed and relevant requirement IDs, the skills used when applicable, the checks actually performed and their results, and any unresolved decision or limitation. Update [`docs/README.md`](README.md) when adding or renaming a specification or workflow document. Update the root README only when project-level setup or usage changes.
