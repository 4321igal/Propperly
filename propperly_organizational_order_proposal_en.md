# Proposal: Organizational Order — Propperly

> Proposal document only. No actual change to code/structure — intended for discussion and a decision before implementation.
> Based on the existing skeleton as it stands today: the root `README.md`, `propperly_initial_project_prompt_en.md`, and each service's `README.md`/`CONTRACT.md`.

## 1. Background and current state

Today there are six services, each a separate workspace in one monorepo: `app`, `services`, `engine`, `data-center`, `storage`, `mcp`. Each service already has a basic documentation layer:

| File | Role today |
|---|---|
| `README.md` | Service responsibility + "what it's not allowed to do" |
| `CONTRACT.md` | External interface signature (no implementation) |
| `package.json` | Workspace identity |
| `src/` | Placeholder only |

This works well at the **service** level (the 6 top-level units). The gap that came up in conversation is one level below that: inside each service there are several **sub-processes / capabilities** (for example, inside Engine: reconstruction, understanding, conflicts, governance, identity, dependencies, obligations — already listed in the original prompt, but without their own documentation or ID), and there is currently no mechanism linking "a process running in code" to "the documentation/rules that define it," and no single central place listing every existing process by ID.

## 2. Goals of the organizational order

1. Every service, and every sub-process inside it, gets a **fixed, unique ID**.
2. There is **one documentation file per sub-process** defining its rules/requirements — not only at the service level as today.
3. There is **one central registry** (single source of truth) listing every existing process by ID, pointing to its documentation and its code.
4. Structures that repeat across services (mainly APP ↔ MCP, both of which are "adapters" with no semantic logic that only call Services) use **the same name and the same layout**, so the symmetry is visible from the names alone.
5. All of this without breaking what already exists and works — this is an added layer, not a change to the existing README/CONTRACT.

## 3. Core principles

- **Single source of truth**: a process ID is defined in exactly one place (the central registry) and referenced everywhere else — never redefined.
- **An ID never changes**: once a process has an ID, that ID is never reassigned or reused, even if the process is later dropped (similar to DB migration numbering).
- **Documentation lives next to the code**: as today (README/CONTRACT inside the service folder) — sub-processes are documented in one more file in the same folder, not in a separate, disconnected location.
- **The ID also appears in code**: a constant/comment at the top of the implementation file, so a log line or error at runtime can be traced back to the documentation.
- **Naming symmetry**: any folder/file that exists in two services in parallel (mainly APP/MCP) uses the same name, at the same relative location.
- **No duplicated logic**: the existing rule (the "Not allowed to do" section in every README) continues to apply at the sub-process level too.

## 4. Documentation layer per service — three levels

| Level | File | What it defines | Status |
|---|---|---|---|
| 1. The service itself | `README.md` | Responsibility + boundaries ("not allowed to do") | Exists |
| 2. External interface | `CONTRACT.md` | Signatures of calls the service exposes/consumes | Exists (`app/CONTRACT.md` is currently empty) |
| 3. Internal sub-processes | `PROCESSES.md` (new) | The service's list of sub-processes, each with an ID, purpose, requirements, status | **Proposed** |

Each entry in `PROCESSES.md` is one sub-process: ID, name, a one-to-two sentence description, "requirements" (what it needs to operate — inputs, dependencies on other services, etc.), and status (planned / in-progress / done).

## 5. ID scheme

### 5.1 Fixed per-service code

| Service | Code |
|---|---|
| APP | `APP` |
| Services | `SVC` |
| Engine | `ENG` |
| Data Center | `DC` |
| Storage | `STO` |
| MCP | `MCP` |

### 5.2 Sub-process ID

Format: `<service-code>-<3-digit sequence number>`, e.g. `ENG-001`. Numbering follows the order processes are added to the registry, not their importance. **Decision:** this short form is the canonical ID — a longer, human-readable form (`PROPPERLY.ENGINE.RECONSTRUCTION`) is not needed as a second ID, since the readable name already lives in the registry's `name` field (section 6). One ID format avoids the two-forms-for-one-thing problem the "single source of truth" principle in section 3 is meant to prevent.

### 5.3 Where the ID appears

1. In its section heading in the service's `PROCESSES.md`.
2. As an exported constant at the top of the matching implementation file (e.g. `export const PROCESS_ID = 'ENG-001';`).
3. In every log line/error emitted by that code path.
4. As a row in the central registry (next section).

This way, an ID seen in a runtime log can always be traced straight back to the documentation describing what it's supposed to do.

## 6. Central registry

One file at the project root holding **every** existing process (both the services themselves and their sub-processes), so there is a single place that knows "which process is which."

**Decision:** start with `REGISTRY.md` only — a hand-maintained, human-readable table, and the actual single source of truth. Do not also hand-maintain a parallel `registry.json` from the start: two hand-written files carrying the same rows is exactly the duplication the "single source of truth" principle (section 3) rules out, since nothing then stops them from drifting apart. `registry.json` is introduced at stage 6 (section 9), together with the validation script that is its only real consumer — at that point it can be generated from `REGISTRY.md` (or `REGISTRY.md` generated from it), so there is still only one place a human edits.

Fields per registry row:

| Field | Description |
|---|---|
| `id` | The fixed identifier |
| `name` | Human-readable name |
| `service` | Which service it belongs to |
| `doc` | Path to its documentation file |
| `status` | planned / in-progress / done |
| `dependsOn` | IDs of other processes/services it depends on (mirrors the arrows in the architecture diagram in the root README) |

## 7. Shared folders between APP and MCP

These two services are similar in nature: both are "adapters" with no semantic logic, and both only call Services (never each other, never Engine/Data Center directly). Right now, the way each of them defines the types it consumes from Services is duplicated separately (`app/src/contract.ts` vs. `mcp/CONTRACT.md` + `ServicesClient`) — a hidden duplication.

Two options, not mutually exclusive:

**Option A — a real shared workspace:** a new `shared/` folder (an additional workspace in `package.json`) holding shared types/DTOs consumed by both `app` and `mcp` (mainly the shape of `ServicesApi`). This removes the duplicate definition of the same contract in two places.

**Option B — naming symmetry only:** if a shared workspace isn't wanted yet, at minimum enforce that both folders use the same internal sub-folder names (e.g. both have `src/services-client/`), so the parallel structure is visible even without actual shared code.

**Decision:** start with Option B (cheap, no dependency changes) and move to Option A once `ServicesApi` starts growing beyond `ping()`.

## 8. Enforcement and maintenance

- Working rule: no new sub-process/module may be added without first adding a row to the central registry and a matching section in the service's `PROCESSES.md`.
- Later on (not part of this stage) — a small script could automatically check that every ID in `registry.json` has both a documentation section and a matching constant in code, failing if something is missing. A future stage, not part of the current proposal.

## 9. Proposed rollout stages

| Stage | Content |
|---|---|
| 0 | Already exists — the 6-service skeleton with README+CONTRACT |
| 1 | Fill in the empty `app/CONTRACT.md`; create `REGISTRY.md` at the root with the 6 services (service level only, no sub-processes yet) |
| 2 | Pilot on Engine only: an `engine/PROCESSES.md` with the sub-processes already named in the original prompt (reconstruction, understanding, conflicts, governance, identity, dependencies, obligations) — ID and "planned" status only |
| 3 | After reviewing the Engine pilot, extend `PROCESSES.md` to the remaining services (Services, Data Center, Storage, APP, MCP) — only once each one's actual sub-processes are identified, since (unlike Engine) the original prompt doesn't enumerate them |
| 4 | Naming symmetry between `app/` and `mcp/` (Option B in section 7), then later consider `shared/` (Option A) |
| 5 | Add the actual ID constant into the placeholder implementation files, and wire it into logs |
| 6 (future) | Validation script + CI check; add `registry.json` at this point (see section 6) |

## 10. Full example — Engine

Here is what part of the proposed `engine/PROCESSES.md` would look like (based on the list already given in Engine's description: reconstruction, understanding, conflicts, governance, identity, dependencies, obligations):

```md
# Engine — Processes

## ENG-001 — Reconstruction
Purpose: reconstruct state/understanding from raw inputs.
Requirements: TBD — not yet defined.
Depends on: Data Center (Living Understanding)
Status: planned

## ENG-002 — Understanding
Purpose: interpret inputs into beliefs/tensions.
Requirements: TBD
Depends on: ENG-001
Status: planned
```

And the matching row it would generate in `registry.json` once that file exists (stage 6):

```json
{
  "id": "ENG-001",
  "name": "Reconstruction",
  "service": "engine",
  "doc": "engine/PROCESSES.md#eng-001--reconstruction",
  "status": "planned",
  "dependsOn": ["DC"]
}
```

## 11. Decisions

The previous draft left these four points open; each is resolved here, with the reasoning kept alongside it since that's what makes the call revisitable if circumstances change.

1. **ID format** — short sequential (`ENG-001`), not the longer `PROPPERLY.ENGINE.RECONSTRUCTION` form. A process only needs one identifier; the readable name already has a home in the registry's `name` field, so a second ID format would just be the same fact stored twice (see section 5.2).
2. **`registry.json`** — deferred to stage 6, introduced together with the validation script that actually reads it. Until then `REGISTRY.md` alone is the source of truth (section 6): hand-maintaining two files with the same rows from day one would recreate the exact duplication section 3 rules out.
3. **APP/MCP shared folder** — Option B (naming symmetry only) now; Option A (a real `shared/` workspace) once `ServicesApi` grows beyond `ping()` (section 7).
4. **Rollout scope** — Engine first, as a pilot (stage 2), before extending to the rest (stage 3). This isn't just about starting small: Engine is the only service whose sub-processes are actually named in the original prompt (reconstruction, understanding, conflicts, governance, identity, dependencies, obligations). Filling in `PROCESSES.md` for the other five now would mean inventing a sub-process breakdown for them that hasn't been decided anywhere yet — a bigger step than this proposal covers.

---
Created as a proposal for discussion. No actual change has been made to the existing code or structure.
