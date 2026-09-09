# SL-01 Workspace Setup — Reconciliation

**Canonical source:** `architecture/slices/sl-01-workspace-setup/SLICE_RECONCILIATION.md` (492 lines, complete)
**Status:** COMPLETE

This document reconciles the system design with code reality and produces the canonical production responsibilities for SL-01. It resolves the key decisions that shape Implementation Design.

**These are logical responsibilities, not microservices.** Module / process / service decomposition is Yigal's Implementation Design task.

---

## Resolved Decisions

| Decision | Status | Resolution |
|---|---|---|
| OD-C23: C2/C3 logical identity | RESOLVED | SAME_LOGICAL_IDENTITY — C2 is always copied from C3; `world/store.ts:113` |
| OD-A9: idempotency semantic | RESOLVED (frozen) | CONFLICT on same intent_id + different input |
| OD-B9: workspace_id namespace scope | RESOLVED | Global UUID, separate namespace from E1; globally unique trivially satisfies E1's org-scoped uniqueness |
| OD-LOC: locator normalization | RESOLVED | `safeResolveWithin()` before all locator comparison and registry writes |
| OD-U2: idempotency mechanism | DEFERRED to Implementation Design | Hash strategy not chosen here |
| OD-STORE: registry persistence technology | DEFERRED to Implementation Design | No storage technology selected (JSON file or SQLite; ADL-005 constraint) |
| OD-GRANT: grant store persistence | DEFERRED to Implementation Design | In-memory spike not promoted; interface (addGrant, revokeGrant, grantsFor) is a Phase 8 deliverable |

**No founder / product decisions are required before Implementation Design.**

---

## R-WL and R-1 Responsibility Mapping

### R-WL — Workspace Lifecycle (NEW)

Owns exclusively:
- Workspace registry (create, read, list)
- Creation idempotency (CONFLICT semantic on intent_id mismatch)
- Locator association (normalized via `safeResolveWithin()`; mutable)
- Workspace enumeration (`listAccessibleWorkspaces(principal)` — post-auth filter)
- WorkspaceState derivation (DERIVED projection; not persisted)
- Authorization gateway (`canEnterWorkspace(principal, workspace_id)`)
- Grant store (technology deferred; interface designed in Implementation Design)

Does NOT own:
- Grant administration, roles, invitations, or policy authoring
- The understanding log or world overlay
- Launch orchestration, API key discovery, or build planning

**Implementation home:** `src/workspace/` (new module)

### R-1 — Local Application Shell (EXTENDED)

Extension: insert workspace routing block at `start.ts:1239–1253` (confirmed safe insertion point in Phase 6: after `--commission-repo` short-circuit, before `discoverApiKey`).

R-1 reads Workspace via R-WL interface. R-1 does NOT write Workspace records.

---

## Workspace Insertion Point

**Safe insertion point (confirmed Phase 6 §5):** `start.ts:1239–1253`

- After `--commission-repo` short-circuit (line ~1239)
- Before `discoverApiKey` (line 1253)
- `assertCanonicalRun` (launch_contract.ts:53) is called at `start.ts:529` — well AFTER the SL-01 insertion point; requires no modification

---

## Commission Entry Point Changes (Boundary Cleanup)

Two production commissioning entry points must accept the SL-01-issued workspace_id as a parameter rather than self-minting from run_id:

**`commission_repo.ts:231`**
- Current: `initWorkspace(dir, \`ws_${run_id}\`, ts)`
- Required: accept `workspace_id: string` from SL-01 registry and pass it instead
- Change type: ADDITIVE — existing callers updated to supply workspace_id from R-WL

**`commission_staged.ts:157`**
- Current: `initWorkspace(dir, \`ws_${opts.run_id}\`, ts)`
- Same additive change

The world layer (C2) requires NO changes — `world/store.ts:113` continues to propagate workspace_id from C3 (understanding layer) automatically.

**OUT OF SCOPE:**
- `pilot_commission.ts:82` — hardcodes `initWorkspace(ws, "pilot-demo", TS)`. This is the PILOT CLI operator tool, not the regular R-1 entry path. Out of scope for first implementation.
- `launch_contract.ts:53` (`assertCanonicalRun`) — guards runId only; CRQ-1 RESOLVED NO_BLOCKER; no change needed.
- Test call sites (~80 `initWorkspace` calls with literal strings) — these test the understanding layer directly; must NOT be updated to use the SL-01 registry.

---

## Workspace Identity Reconciliation

**Decision: SL-01 workspace_id IS the existing canonical downstream workspace_id.**

SL-01's registry becomes the upstream issuer of the value that C3 (`LivingUnderstandingState.workspace_id`) and C2 (`WorldState.workspace_id`) carry. Do NOT create a new separate namespace. Do NOT maintain a parallel mapping table.

**OD-B9 RESOLVED:** E1 `WorkspaceAccess` uses `(principal_id, organization_id, workspace_id)`. SL-01 workspace_id is a globally unique UUID. Global uniqueness satisfies E1's org-scoped uniqueness. SL-01 grants written to the E1 grant store are safe without adding org_id to the SL-01 side (BV-5 closed).

**workspace_id format constraint:** opaque `OPAQUE_ID_RE = /^[A-Za-z0-9_-]{1,128}$/`. UUID is a GENERATION STRATEGY only. `assertValidId()` MUST_REUSE unchanged.

---

## Deferred Decisions (OD-U2, OD-STORE, OD-GRANT)

| Decision | Deferred to | Constraint |
|---|---|---|
| OD-U2: idempotency mechanism (hash strategy) | Implementation Design | Must use deterministic hash of creation input; no model call; sibling pattern `source_approval.ts` is reference |
| OD-STORE: registry persistence technology | Implementation Design | Must satisfy ADL-005 (no cloud-mandatory); `writeJsonAtomic` MUST_REUSE for write path |
| OD-GRANT: grant store persistence technology | Implementation Design | Must be local-filesystem or in-process; interface (addGrant, revokeGrant, grantsFor) is a Phase 8 deliverable |

---

## What Phase 8 (Implementation Design) Must Deliver

1. `src/workspace/` module with WorkspaceRegistry and authorization gateway (R-WL)
2. Production commissioning entry point changes at `commission_repo.ts:231` and `commission_staged.ts:157`
3. `start.ts:1239–1253` routing block (R-1 extension)
4. Acceptance tests extracted from spikes before spike deletion
5. Green test suite (≤19/375 failing; no new regressions)

**What Phase 8 must NOT do:**
1. Select a final storage technology without explicit authorization
2. Wire ACLs
3. Change launch behavior except at the `start.ts:1239–1253` insertion point
4. Promote spike code verbatim
5. Add UUID-format validation on workspace_id (opaque string only)
6. Increase the 19/375 failing baseline by weakening tests
