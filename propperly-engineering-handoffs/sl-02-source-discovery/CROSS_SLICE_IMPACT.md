# SL-02 Source Discovery — Cross-Slice Impact

**Source:** `architecture/slices/slice-01-source-discovery/CROSS_SLICE_IMPACT.md`  
**Status:** COMPLETE

This document covers cross-slice consequences relevant to Engineering's Implementation Design. It does NOT attempt to answer the implementation questions — those are Yigal's scope.

---

## The two open blocking questions (require joint resolution)

### Q1 — launch_contract.ts state-aware start

**Question:** How does `launch_contract.ts` detect whether a workspace has an Approved Source Inventory, and what does it do when one is absent?

**Why it blocks:** `launch_contract.ts` is the canonical launch plan and route authority. SL-02's first-run entry point must integrate with it, not bypass it. The current `bootstrapAndConverge` call path does not check for inventory presence.

**Owner:** Architecture + Engineering  
**Impact:** Determines how `propperly start` routing is implemented in R-1. The reconciliation recommendation (state-aware conditional dispatch) requires this integration to be designed.

**What Engineering needs to produce:** A design for how the state-aware dispatch condition is evaluated — where the check lives, what the inventory-absence signal is, and how the transition to `bootstrapAndConverge` is preserved for returning users.

---

### Q8 — ACL permissions mapping for SL-02

**Question:** What ACL permissions does the source discovery and approval flow require, and how do they map to the enterprise policy model in `src/enterprise/e1/audit.ts`?

**Why it matters:** Without a defined ACL mapping, the enterprise version of SL-02 has no authorization upper bound. The WS-16 audit established that E2/E3 enterprise identity contracts are NOT SUPPORTED in the current implementation (gap `B3-B`).

**Owner:** Architecture + Engineering  
**Impact:** Not a blocker for the local prototype. Required before enterprise GA.

**What Engineering needs to produce:** An assessment of which ACL enforcement points are required for the enterprise deployment path, and whether the existing `enterprise/e1/audit.ts` interface is sufficient or needs extension.

---

## Closed cross-slice questions (not Engineering's concern)

| Question | Resolution |
|---|---|
| Q2 — Does SL-02 define the Source entity shape? | CLOSED — SL-02 defines the authority transition (SourceInventory). The canonical Source entity shape is defined by the world layer (SL-03+). |
| Q10 — Does SL-02 write to world state? | CLOSED — NO. SL-02 writes only the Approved Source Inventory. World-state reconstruction (`bootstrapAndConverge`) consumes it post-confirmation; it does not call world-layer writes itself. |

---

## Shared candidates (decisions deferred to later design)

### Q3 — SourceInventory version format

**Status:** SHARED_CANDIDATE — not decided by SL-02 alone

The `inventory_version` field is used for confirmation idempotency and optimistic concurrency. Its exact format (monotonic counter, content hash, timestamp, or UUID) affects how later slices detect stale inventories.

**What Engineering should be aware of:** The format choice must be consistent across any consumer of the inventory. Yigal should flag if Implementation Design commits to a format, so Architecture can propagate it to downstream slices.

---

### Q4 — DiscoveryRun storage location and retention policy

**Status:** SHARED_CANDIDATE — not decided by SL-02 alone

Discovery run files (`meta.json`, `evidence.ndjson`, `decisions.ndjson`, `run.log`) have no defined retention policy. They accumulate on disk. A later slice or operational design must address rotation/cleanup.

**What Engineering should be aware of:** Do not design a permanent storage assumption for run files. Make the storage location configurable (or at minimum not hard-coded outside `PROPPERLY_HOME`).

---

## Local consequences (SL-02 only)

### Q5 — Session discovery path containment

SL-02 must add an `isContained` path-containment guard to the promoted `spike/session_discovery.ts` before it becomes production code. This is an SL-02-local consequence with no cross-slice impact.

### Q7 — `candidate_store.ts` test registration

A missing canonical test for `candidate_store.ts` is an SL-02-local pre-promotion gate. No cross-slice impact.

### Q9 — `discovery_orchestrator.ts` test registration

A missing canonical test for `discovery_orchestrator.ts` is an SL-02-local pre-promotion gate. No cross-slice impact.

---

## B-08 — Web Review Interface (cross-track consequence)

The Web Review Interface (UX state S3/S4, the Candidate Review UI) spans three tracks:

| Track | Status |
|---|---|
| Design | DESIGN_NOT_STARTED |
| Architecture | Scoped (minimum requirements in UX.md) |
| Engineering | API surface to be defined in Implementation Design |

**For Engineering:** The backend API surface that the Web Review Interface consumes is an Implementation Design deliverable. The visual design follows the API surface. Do not defer the API design waiting for the visual design — those can proceed in parallel.

**No cross-slice dependency:** The Web Review Interface is hosted inside `onboarding_server` (R-1). It does not introduce new cross-slice contracts.
