# SL-01 Workspace Setup — Cross-Slice Impact

**Source:** `architecture/slices/sl-01-workspace-setup/SLICE_RECONCILIATION.md` §§4,8,14
**Status:** COMPLETE

This document covers cross-slice consequences relevant to Engineering's Implementation Design. It does NOT attempt to answer the implementation questions — those are Yigal's scope.

---

## SL-01 → SL-02 Handoff Contract

SL-01 delivers to SL-02 exactly:

| Item | Guarantee |
|---|---|
| `workspace_id` | Stable, immutable, confirmed by R-WL registry |
| Resolved identity (`PrincipalRef`) | Authenticated, unambiguous |
| Confirmed right-to-enter | ACL gate returned GRANTED at open time (not only at enumeration time) |
| WorkspaceState discriminator | `PRE_COMMISSION` or `BEYOND_SL01` |
| Reachable locator | Workspace locator is accessible at handoff time |

**Negative assertion:** At the SL-02 handoff boundary, these entities do not exist for the handed-off workspace: Source, SourceCandidate, DiscoveryRun, SourceInventory, IdentityEvidence, CandidateDisposition, ConfirmationReceipt.

SL-01 does NOT reopen SL-02 decisions. The Source Discovery architecture (System Design V3.1, CAP-01 through CAP-08) is ACCEPTED and frozen.

---

## Open Cross-Slice Questions (Engineering Input Required)

### Q1 — launch_contract.ts Integration (shared with SL-02 B-02)

**Question:** How does `launch_contract.ts` / `start.ts` detect workspace count and WorkspaceState, and what does it do in each routing branch?

**Why it matters:** `launch_contract.ts` is the canonical launch plan. SL-01's workspace routing must integrate with it, not bypass it. The safe insertion point is `start.ts:1239–1253` (Phase 6 confirmed). The exact routing block design — how the workspace_id and locator flow from R-WL through to `buildLaunchPlan()` — is an Engineering input.

**Owner:** Architecture + Engineering
**Phase 10 topic:** Where the workspace routing block lives; how `workspace_id` and locator pass to `buildLaunchPlan()`; how the `--commission-repo` short-circuit coexists.

This question is shared with SL-02's Q1/B-02 (inventory presence check integration). The Engineering solution for SL-01's workspace routing and SL-02's inventory check must be consistent in their approach to `launch_contract.ts`.

### Q2 — ACL Permissions Mapping

**Question:** How do `listAccessibleWorkspaces` and `canEnterWorkspace` map to the existing WS-17/WS-18/WS-19 ACL gate structure?

**Why it matters:** WS-16 found E2/E3 NOT SUPPORTED. For E0/E1 deployments, `canEnterWorkspace` is PARTIALLY_SUPPORTED (any authenticated principal with an ACTIVE WorkspaceAccess record is GRANTED). E2+ workspace-grain differentiation is deferred.

**Owner:** Architecture + Engineering
**Phase 10 topic:** Which gate conditions correspond to workspace right-to-enter; whether E2/E3 gaps (WS-16) affect SL-01 identity contracts; how `resolveAdapterPrincipal` (WS-19 pattern) maps to SL-01 PrincipalRef.

---

## R-1 as SHARED_CANDIDATE

R-1 (Local Application Shell) is touched by both SL-01 (workspace routing) and SL-02 (source discovery wizard + API routes). R-1 is classified as SHARED_CANDIDATE between SL-01 and SL-02 — eligible for Phase 9 cross-slice synthesis upgrade.

Engineering should be aware that any changes to `src/dev/start.ts`, `src/shell/onboarding_server.ts`, or `src/cli/propperly.ts` for SL-01 will be in the same module that SL-02 extends. The SL-01 routing block and the SL-02 inventory-presence check must be designed to coexist cleanly.

---

## DATA_OWNERSHIP_MAP and PRODUCTION_RESPONSIBILITY_MAP Updates (Phase 7 Task)

Two architecture documents must be updated as a Phase 7 task (no production code changes required):

1. **PRODUCTION_RESPONSIBILITY_MAP.md** — Add R-WL (Workspace Lifecycle) as a new production responsibility.
2. **DATA_OWNERSHIP_MAP.md** — Reassign Workspace and WorkspaceState from R-1 to R-WL (documentation-only conflict; no incumbent production code to displace).
3. **AUTHORITY_MAP.md** — Add A-WL1 (Workspace Creation), A-WL2 (Right-to-Enter Confirmation), A-WL3 (Workspace State Classification) as new authority events introduced by SL-01.

Engineering may proceed on Implementation Design before these updates are applied; they are documentation tasks, not implementation dependencies.

---

## SL-01 → Slice 00 (Operating Map Finding)

The Slice 00 finding: every product flow routes through SL-01 before any other slice. If C17 (Deployment & Environment Management) gets its own slice ("Slice 00"), that slice would precede SL-01. This is an open Operating Map question, not a blocker for SL-01 Implementation Design.
