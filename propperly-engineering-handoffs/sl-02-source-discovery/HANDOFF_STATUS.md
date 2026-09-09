# SL-02 Source Discovery — Handoff Status

**Package date:** 2026-09-08  
**Package owner:** Architecture  
**Target:** Yigal / Engineering (Implementation Design)

---

## Document readiness

| Document | Content status | Notes |
|---|---|---|
| [PRODUCT.md](PRODUCT.md) | APPROVED | No open product decisions — FD-S01-A normalized 2026-09-08 (see below) |
| [SYSTEM.md](SYSTEM.md) | READY FOR HUMAN REVIEW | GD-01 patch applied 2026-09-08: component diagram, logical sequence, entity relationships. Semantic content complete. |
| [UX.md](UX.md) | READY FOR HUMAN REVIEW | 6-step journey + 7 states complete. Web Review Interface (S3/S4) scoped but no design artifact. |
| [UI.md](UI.md) | PENDING DESIGN TRACK | No accepted visual design exists. Design track not yet initiated. |
| [CODE_REALITY_AUDIT.md](CODE_REALITY_AUDIT.md) | COMPLETE | Condensed from `propperly-local-poc/SLICE_01_CODE_REALITY_AUDIT.md`. |
| [RECONCILIATION.md](RECONCILIATION.md) | COMPLETE | Condensed from `propperly-local-poc/SLICE_01_RECONCILIATION.md`. R-1 through R-4 stable. |
| [CROSS_SLICE_IMPACT.md](CROSS_SLICE_IMPACT.md) | COMPLETE | Q1/Q8 OPEN; Q2/Q10 CLOSED; Q3/Q4 deferred; Q5/Q7/Q9 local. |
| [PROOFS/README.md](PROOFS/README.md) | COMPLETE | CAP-01 through CAP-08; PROVEN/PARTIAL with evidence. |

---

## Normalized / resolved decisions

### FD-S01-A — STALE_DECISION_ALREADY_RESOLVED

**Classification:** STALE_DECISION_ALREADY_RESOLVED — normalized 2026-09-08.

**Original question:** Confirm state-aware dispatch (`propperly start` routes on inventory presence) vs new verb (`propperly setup`).

**Evidence that resolves it:**
- V3.1 D10 (line 76): "propperly start resolves current workspace/discovery state rather than blindly restarting."
- V3.1 D19 (line 103): "`propperly start` remains the canonical product entry and dispatches according to workspace/source-authority state rather than exposing internal capability verbs."
- V3.1 §9 state machine: explicit dispatch tree showing state-aware routing.
- PRODUCT.md (APPROVED) user journey: "User launches Propperly on a fresh install. System detects no Approved Source Inventory. Discovery wizard opens in browser." + "Once an Approved Source Inventory exists, `propperly start` routes to reconstruction as today."
- RECONCILIATION.md recommendation: state-aware dispatch = YES (recommended); namespaced verb = NOT FOR MVP.

**Both halves resolved:** State-aware dispatch is adopted (V3.1 D10/D19, PRODUCT.md). Namespaced verb is explicitly NOT FOR MVP (RECONCILIATION.md).

**Residue — not dropped:** The HOW question (WHERE the inventory-presence check lives in `launch_contract.ts`) is tracked as Q1/B-02 — an Engineering input for Phase 10 Implementation Design. Nothing is silently dropped.

**Source of drift:** RECONCILIATION.md line 95 retained a "FOUNDER DECISION — OPEN" label after V3.1 D10/D19 and PRODUCT.md (APPROVED) already resolved the product behavior. The label has been normalized.

---

## Open blockers by owner

### Engineering inputs for Phase 10 — not pre-handoff blockers

Q1/B-02 and Q8/B-03 are engineering HOW-level questions Yigal resolves in Phase 10 Implementation Design. They are **not** blockers of the pre-handoff package. They gate Phase 15 (Human Review) per `ORCHESTRATOR.md §4b` — scope: PHASE_TRANSITION_STOP.

| Input | Document | Phase 10 topic |
|---|---|---|
| **Q1 / B-02** — `launch_contract.ts` state-aware start integration | CROSS_SLICE_IMPACT.md | WHERE the inventory check lives; HOW dispatch integrates with `launch_contract.ts`; product behavior already decided (D10/D19) |
| **Q8 / B-03** — ACL permissions mapping | CROSS_SLICE_IMPACT.md | Enterprise authorization mapping to existing ACL model; not a local-prototype blocker |

### Requires Engineering decision in Implementation Design

| Blocker | Document | Impact |
|---|---|---|
| **CAP-08 CAS** — multi-process confirmation serialization | PROOFS/README.md | Production topology-dependent; top risk |
| **P6** — 8 pre-existing git boundary violations | CODE_REALITY_AUDIT.md | Audit required before GA |

### Requires Design track initiation

| Blocker | Document | Impact |
|---|---|---|
| **B-08** — Web Review Interface visual design | UI.md | No design artifact exists; backend API surface (Engineering's) can proceed independently |

### Requires Architecture gate resolution

| Blocker | Document | Impact |
|---|---|---|
| **GD-01** — System Design template format standard | SYSTEM.md | 3 doc-format items; does NOT block Yigal |

---

## Verdict

**ENGINEERING_REVIEW_READY: YES — FINAL_HANDOFF_READY: NO (UI pending)**

### ENGINEERING_REVIEW_READY = YES

All semantic content is complete and stable. Yigal may begin Implementation Design now for all non-UI components (R-2, R-3, R-4, and backend R-1 routes).

Conditions met as of 2026-09-08:
- Phase 9 Reconciliation: COMPLETE
- System Design (GD-01 patch): APPLIED — component diagram, logical sequence, entity relationships
- FD-S01-A: NORMALIZED (STALE_DECISION_ALREADY_RESOLVED — state-aware dispatch adopted in V3.1 D10/D19 and PRODUCT.md)
- PRODUCT.md: APPROVED — no open product decisions
- All semantic package docs: COMPLETE

### FINAL_HANDOFF_READY = NO

One item prevents complete handoff:
- **UI.md** — no accepted visual design for the Web Review Interface (S3/S4). Engineering can proceed on all backend components; the visual design must be initiated as a separate Design track deliverable (B-08).

### Summary

| State | Status | Condition |
|---|---|---|
| ENGINEERING_REVIEW_READY | **YES** | Yigal may begin Phase 10 Implementation Design |
| FINAL_HANDOFF_READY | **NO** | Requires UI wireframe (B-08) + Phase 11/12 closure |

---

## Package self-sufficiency

This package is designed to be portable. If Yigal copies only `architecture/handoffs/sl-02-source-discovery/`, the following are needed to resolve references:

| Reference | Location |
|---|---|
| Full code reality audit | `propperly-local-poc/SLICE_01_CODE_REALITY_AUDIT.md` |
| Full reconciliation | `propperly-local-poc/SLICE_01_RECONCILIATION.md` |
| System Design V3.1 | `architecture/slices/slice-01-source-discovery/system/SLICE_01_SOURCE_DISCOVERY_SYSTEM_V3_1.md` |
| Spike evidence | `propperly-local-poc/src/spike/` |
| Canonical source code | `propperly-local-poc/src/` |

All architecture input that is not derivable from code is included in this package.
