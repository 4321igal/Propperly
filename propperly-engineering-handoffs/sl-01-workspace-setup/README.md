# SL-01 Workspace Setup — Engineering Handoff Package

**For:** Yigal / Engineering
**From:** Architecture
**Date:** 2026-09-08
**Purpose:** Input to Implementation Design — not an Implementation Design

---

## What this package is

Everything Engineering needs to begin designing how to build Workspace Setup. It is:

- Product intent (what the customer gets, why it matters)
- System design (entities, state, invariants, capabilities)
- UX semantics (what the user experiences at each routing branch)
- Code reality (what exists, what is spike-only, what is genuinely missing)
- Architecture decisions already made, and which ones still require Engineering input

It is **not**:

- An Implementation Design — module allocation, storage technology, schema design, API/protocol choices, process topology, and deployment mechanics are Yigal's to design
- A build authorization — `APPROVED_FOR_BUILD` requires an explicit human commit to `architecture/approved/`
- A UI specification — no accepted visual design exists yet (see UI.md)

---

## Naming disambiguation — IMPORTANT

**Product SL-01 = Workspace Setup.** Working directory: `architecture/slices/sl-01-workspace-setup/`.

**Product SL-02 = Source Discovery.** Historical working directory: `architecture/slices/slice-01-source-discovery/` (a known alias — do NOT rename it). SL-02's handoff package is at `architecture/handoffs/sl-02-source-discovery/`.

The `slice-01` / `SL-02` and `sl-01` / SL-01 naming is a known mismatch from the historical AOS process. All canonical documents in this package use the product name **SL-01** for Workspace Setup.

---

## Document map

| File | What it contains | Status |
|---|---|---|
| [PRODUCT.md](PRODUCT.md) | Customer outcome, actor model, FD-2 routing, in/out of scope, handoff to SL-02 | APPROVED |
| [SYSTEM.md](SYSTEM.md) | Entities, R-WL and R-1 responsibilities, component diagram, logical sequence, entity relationships, 8 scenarios, invariants, failure modes, acceptance scenarios | READY — GD-01 patch applied 2026-09-08 |
| [UX.md](UX.md) | 5 UX states, scenario-to-user-experience mapping | DERIVED |
| [UI.md](UI.md) | UI specification | PENDING DESIGN TRACK |
| [CODE_REALITY_AUDIT.md](CODE_REALITY_AUDIT.md) | Current codebase map, capability classification, promotion verdicts | COMPLETE |
| [RECONCILIATION.md](RECONCILIATION.md) | Reconciled production responsibilities R-WL and R-1, ODs resolved/deferred | COMPLETE |
| [CROSS_SLICE_IMPACT.md](CROSS_SLICE_IMPACT.md) | SL-01→SL-02 handoff contract, shared questions, DATA_OWNERSHIP_MAP update | COMPLETE |
| [PROOFS/README.md](PROOFS/README.md) | SPIKE-A (A1–A14) and SPIKE-B (B1–B12) proof index | COMPLETE |
| [HANDOFF_STATUS.md](HANDOFF_STATUS.md) | Document readiness and open blockers by owner | IN_REVIEW |

---

## How to read this package

**Start with PRODUCT.md** — one page on what the customer gets and why, including all three resolved founder decisions (FD-1/FD-2/FD-3).
**Then SYSTEM.md** — the entity model (Workspace, WorkspaceState discriminator, R-WL/R-1 boundary) and the 8 system scenarios constrain everything downstream.
**Then RECONCILIATION.md** — R-WL and R-1 responsibilities mapped to specific code locations and pending actions.
**Then CODE_REALITY_AUDIT.md** — what exists in production, what is spike-only, what is missing.
**Then CROSS_SLICE_IMPACT.md** — the SL-01→SL-02 handoff contract, shared questions, and DATA_OWNERSHIP_MAP update needed.
**Then UX.md** — what the user sees at each routing branch.
**UI.md** — read last; no accepted design yet.
**PROOFS/README.md** — look up a spike proof to see what is empirically proven and what is not.

---

## Engineering inputs for Phase 10 Implementation Design

These are open questions Yigal resolves in Phase 10. They are **not** blockers of the pre-handoff package or the ENGINEERING_REVIEW_READY state.

| Input | Owner | Phase 10 topic |
|---|---|---|
| **Q1** — `launch_contract.ts` integration: where does SL-01 workspace routing insert relative to `assertCanonicalRun` and `buildLaunchPlan`? | Architecture + Engineering | CRQ-1 RESOLVED as NO_BLOCKER from Phase 6: insertion point is `start.ts:1239–1253`; `assertCanonicalRun` requires no change |
| **Q2** — ACL permissions mapping: how do `listAccessibleWorkspaces` and `canEnterWorkspace` map to the existing WS-17/WS-18/WS-19 ACL gate structure? | Architecture + Engineering | U-3 from System Design; PARTIALLY_SUPPORTED for E0/E1; E2+ deferred |
| **CRQ-1** — `assertCanonicalRun` extension | Engineering | OPEN (see Code Reality Audit) — resolved NO_BLOCKER in Phase 6; no refactoring needed |
| **BV-2** — DATA_OWNERSHIP_MAP documentation conflict | Architecture | RESOLVED (documentation-only conflict; Phase 7 task: add R-WL to maps — no production code change required) |
| **DATA_OWNERSHIP_MAP update** | Architecture | Phase 7 task: add R-WL to PRODUCTION_RESPONSIBILITY_MAP.md and update DATA_OWNERSHIP_MAP.md; AUTHORITY_MAP.md to get A-WL1/A-WL2/A-WL3 |

**GD-01 — CLOSED 2026-09-08:** Component diagram, logical sequence diagram, and entity relationship clarification have been applied to SYSTEM.md. §2 naming aligned to reconciliation semantics (MULTIPLE/LOCATOR_STALE corrected; `openWorkspace`/`readWorkspaceState` naming normalized). WorkspaceState cross-slice divergence documented.

---

## Note on SLICE_IMPLEMENTATION_DESIGN.md

A pre-existing `SLICE_IMPLEMENTATION_DESIGN.md` exists at `architecture/slices/sl-01-workspace-setup/SLICE_IMPLEMENTATION_DESIGN.md`. This is an engineering design input and reference artifact from the AOS process. It is **not** the frozen Implementation Design that Yigal produces in Phase 10 — Yigal owns the final Implementation Design. The pre-existing file may be consulted as background but does not constrain or replace the Phase 10 deliverable.

---

## What Yigal should produce

An **Implementation Design** document covering:

1. Module / process allocation for R-WL (Workspace Lifecycle) and R-1 extension
2. Workspace registry storage technology and schema (OD-STORE: deferred — JSON file or SQLite, ADL-005 compliant)
3. Grant store persistence technology (OD-GRANT: deferred — interface designed, technology not selected)
4. Idempotency mechanism for workspace creation (OD-U2: deferred — hash strategy not chosen; CONFLICT semantic frozen)
5. ACL mapping and authorization wiring (Q2 Engineering input)
6. `start.ts:1239–1253` routing block design (R-1 extension)
7. `commission_repo.ts:231` and `commission_staged.ts:157` parameter addition (additive — accept SL-01 workspace_id)
8. Build milestones and rollout sequence

The Implementation Design may proceed without UI.md being complete for all backend components (R-WL, authorization gateway, state-aware dispatch).
