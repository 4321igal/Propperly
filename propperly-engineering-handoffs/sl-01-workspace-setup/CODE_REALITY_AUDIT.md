# SL-01 Workspace Setup — Code Reality Audit

**Canonical source:** `architecture/slices/sl-01-workspace-setup/SLICE_CODE_REALITY_AUDIT.md` (457 lines, complete)
**Audit date:** 2026-09-08
**Branch at audit:** `feature/knowledge-subject-view` (dirty tree)
**Auditor:** Architecture — read-only, zero functional changes

This document is a condensed handoff view. For the complete audit, read the canonical source.

---

## SL-01 Handoff Guarantee (Frozen Contract)

| Frozen Decision | Value |
|---|---|
| FD-1 | Self-service primary; org-level provisioning NOT SL-01 scope |
| FD-2 | 0→CREATE+proceed; 1→auto-open+proceed; 2+→selection+proceed |
| FD-3 | SL-01 resolves identity and enforces existing right-to-enter; does NOT own ACL admin |
| workspace_id | Stable opaque identity; immutable once assigned (OPAQUE_ID_RE) |
| locator | Mutable attribute; NOT identity |
| Idempotency key | `creation_intent_id` (CONFLICT semantic on mismatch) |
| SL-01 handoff guarantee | stable workspace_id + resolved PrincipalRef + right-to-enter GRANTED + WorkspaceState ∈ {PRE_COMMISSION, BEYOND_SL01} + locator reachable |
| SL-01 must NOT create | Source, SourceCandidate, DiscoveryRun, SourceInventory, IdentityEvidence, CandidateDisposition, ConfirmationReceipt |

---

## Capability Classification Summary

| Capability | Classification | Evidence |
|---|---|---|
| CAP-SL01-01: APPLICATION_ENTRY_WORKSPACE_ROUTING | PARTIALLY_ALIGNED | R-1 entry proven; workspace routing extension MISSING in production and spike |
| CAP-SL01-02: DURABLE_WORKSPACE_REGISTRY | SPIKE_ONLY | `src/spike/workspace_registry.ts` — no production counterpart |
| CAP-SL01-03: WORKSPACE_CREATION | SPIKE_ONLY | `workspace_registry.ts:createWorkspace()` — no production counterpart |
| CAP-SL01-04: ACCESSIBLE_WORKSPACE_ENUMERATION | SPIKE_ONLY | `workspace_authorization.ts:listAccessibleWorkspaces()` — no production counterpart |
| CAP-SL01-05: WORKSPACE_ACCESS_AUTHORIZATION | SPIKE_ONLY | `workspace_authorization.ts:canEnterWorkspace()` — E1 schema is production; no gateway methods |
| CAP-SL01-06: LOCATOR_REACHABILITY_CHECK | SPIKE_ONLY | `workspace_registry.ts:checkLocatorReachability()` — no production counterpart |
| CAP-SL01-07: WORKSPACE_STATE_CLASSIFICATION | MISSING | WorkspaceState discriminator absent from production AND spike code |

All SL-01 capabilities are TARGET_ONLY in production (0 production code satisfies them).

---

## Key Findings

### CRQ-1 — `assertCanonicalRun()` (RESOLVED as NO_BLOCKER)

`launch_contract.ts:53` contains `assertCanonicalRun()`. SL-01 ends pre-commission.

**Resolution (Phase 6 §5):** `assertCanonicalRun` guards `runId` only — it does NOT guard workspace count or WorkspaceState discriminator. It is called at `start.ts:529` inside the commissioned-run flow — well AFTER the SL-01 insertion point at `start.ts:1239–1253`. SL-01 routing inserts BEFORE `buildLaunchPlan()` is called. **No refactoring of `assertCanonicalRun` is required.**

SL-01's workspace routing is additive: insert workspace enumeration/routing at `start.ts:1239–1253` (after `--commission-repo` short-circuit, before `discoverApiKey`).

### CRQ-3 — No Workspace Registry in Production

- No `WorkspaceRegistry` exists in production code.
- No workspace-grain ACL infrastructure exists beyond the E1 `WorkspaceAccess` data schema (landed WS-19, `enterprise/e1/types.ts:66`).
- No PRE_COMMISSION routing exists in `launch_contract.ts`.
- No `WorkspaceState` discriminator classification function exists anywhere.

All of the above are genuine gaps to be filled by Implementation Design. None require deletion or replacement of existing production code — all changes are additive.

### BV-2 — Documentation Conflict (RESOLVED)

`DATA_OWNERSHIP_MAP.md:15,22` assigns Workspace/WorkspaceState to R-1.
`SLICE_SYSTEM_DESIGN.md` assigns Workspace lifecycle writes to R-WL.

**Resolution (Phase 6 §7 discriminating check):** No production code writes an entity matching the DATA_OWNERSHIP_MAP "Workspace / WorkspaceState owned by R-1, Durable, Canonical" claim. The conflict is **documentation-only** — there is no incumbent production implementation to displace. Phase 7 adds R-WL to PRODUCTION_RESPONSIBILITY_MAP.md and updates DATA_OWNERSHIP_MAP.md. No production code changes required.

---

## Production Code Map

### What exists and is PROVEN

| Component | Location | Role |
|---|---|---|
| CLI dispatcher | `src/cli/propperly.ts` | Command routing; `start` at line 1050 → `bootstrapAndConverge` |
| Launch contract | `src/dev/launch_contract.ts` | Route constants, canonical launch plan; `assertCanonicalRun` at line 53 (guards runId only) |
| Main entry | `src/dev/start.ts:1207` | R-1 shell entry point; insertion point for SL-01 routing at lines 1239–1253 |
| Current workspace pointer | `src/dev/current_workspace.ts:writeCurrentWorkspace()` | Records locator + owner; NOT a Workspace entity (C4 locator pointer only) |
| Atomic write | `src/lib/atomic_write.ts` | `writeJsonAtomic` — MUST_REUSE for WorkspaceRegistry |
| Path containment | `src/opconseq/safe_path.ts:71` | `safeResolveWithin()` — MUST_REUSE for all locator resolution |
| Id validation | `src/enterprise/scope_path.ts:37` | `assertValidId()` — MUST_REUSE for workspace_id validation (OPAQUE_ID_RE) |
| E1 WorkspaceAccess schema | `enterprise/e1/types.ts:66` | `WorkspaceAccess { access_id, principal_id, organization_id, workspace_id, state }` — production extension point; no gateway methods yet |
| Understanding mint point | `understanding/store.ts:63` | `initWorkspace(dir, workspace_id, ts)` — C3; immutable after genesis; caller must supply workspace_id from SL-01 registry |

### What is SPIKE_ONLY (no production wiring)

| File | Capability | Phase 5 verdict |
|---|---|---|
| `src/spike/workspace_registry.ts` | WorkspaceRegistry: create, list, idempotency, locator | PROVEN (A1–A14) |
| `src/spike/workspace_registry.test.ts` | SPIKE-A 14 test cases | PROVEN |
| `src/spike/workspace_authorization.ts` | listAccessibleWorkspaces, canEnterWorkspace | PROVEN (B1–B12, B9 PARTIAL) |
| `src/spike/workspace_authorization.test.ts` | SPIKE-B 12 test cases | PROVEN |

### What is MISSING (not in production or spike)

1. **WorkspaceState discriminator function** — the 3-way enum (NO_WORKSPACE / PRE_COMMISSION / BEYOND_SL01) exists only in design documents.
2. **FD-2 routing layer** — 0/1/2+ workspace count dispatch at `start.ts:1239–1253`.
3. **Durable grant store** — SPIKE-B grant store is in-memory only.
4. **Locator normalization** — `safeResolveWithin()` not wired into spike registry.

---

## Promotion Verdicts

| File | Verdict | Key action |
|---|---|---|
| `spike/workspace_registry.ts` | EXTRACT acceptance tests; REIMPLEMENT in `src/workspace/` | Schema tag `spike_v1` → `v1`; CONFLICT semantic replaces REPLAY_IGNORE |
| `spike/workspace_authorization.ts` | EXTRACT acceptance tests; REIMPLEMENT in `src/workspace/` | Grant store must be durable, not in-memory; interface preserved |

**None of the spike files should be promoted verbatim.** See RECONCILIATION.md §12 for spike disposition.

---

## What SL-01 Must NOT Create

At the SL-02 handoff boundary, for the handed-off workspace, none of these entities may exist:
- `Source`
- `SourceCandidate`
- `DiscoveryRun`
- `SourceInventory`
- `IdentityEvidence`
- `CandidateDisposition`
- `ConfirmationReceipt`

---

## Test Baseline (Phase 6 measurement)

**19 of 375 REQUIRED_CANONICAL surfaces failing** (measured 2026-09-08, dirty tree, `feature/knowledge-subject-view`). These are pre-existing failures; SL-01 Phase 6 introduced no new failures. Implementation Design must not increase this count.

`workspace_id` format constraint: opaque `OPAQUE_ID_RE = /^[A-Za-z0-9_-]{1,128}$/`. UUID is a generation strategy, NOT a validated format. Approximately 80 test call sites use literal strings like `"ws_launch_test"` or `"pilot-demo"` — do not add UUID-format validation.
