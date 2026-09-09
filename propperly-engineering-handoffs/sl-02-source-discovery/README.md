# SL-02 Source Discovery — Engineering Handoff Package

**For:** Yigal / Engineering  
**From:** Architecture  
**Date:** 2026-09-08  
**Purpose:** Input to Implementation Design — not an Implementation Design

---

## What this package is

Everything Engineering needs to begin designing how to build Source Discovery. It is:

- Product intent (what the customer gets, why it matters)
- System design (entities, state, invariants, capabilities)
- UX semantics (what the user experiences, step by step)
- Code reality (what exists, what must be promoted, what is missing)
- Architecture decisions already made, and which ones still require human input

It is **not**:

- An Implementation Design — service decomposition, DB technology, persistence schema, API/protocol choice, process count, and deployment mechanics are Yigal's to design
- A build authorization — `APPROVED_FOR_BUILD` requires an explicit human commit to `architecture/approved/`
- A UI specification — no accepted visual design exists yet (see UI.md)

---

## Naming disambiguation — IMPORTANT

The working directory for this slice is `architecture/slices/slice-01-source-discovery/`.  
The **product name** of this slice is **SL-02 — Source Discovery**.  
`sl-01-workspace-setup/` (a different directory) = product SL-01.

The `slice-01` / `SL-02` mismatch is a known alias. All canonical documents in this package use the product name **SL-02**. When navigating code or architecture directories, use `slice-01-source-discovery/`.

---

## Document map

| File | What it contains | Status |
|---|---|---|
| [PRODUCT.md](PRODUCT.md) | Customer outcome, product flows, no open product decisions | APPROVED |
| [SYSTEM.md](SYSTEM.md) | Entities, state model, invariants, ADL decisions, capabilities | READY FOR HUMAN REVIEW — GD-01 patch applied 2026-09-08 |
| [UX.md](UX.md) | 6-step journey, 7 UX states, surfaces | READY FOR HUMAN REVIEW |
| [UI.md](UI.md) | UI specification | PENDING DESIGN TRACK |
| [CODE_REALITY_AUDIT.md](CODE_REALITY_AUDIT.md) | Current codebase map, promotion verdicts, risks | COMPLETE |
| [RECONCILIATION.md](RECONCILIATION.md) | Reconciled production responsibilities R-1 through R-4 | COMPLETE |
| [CROSS_SLICE_IMPACT.md](CROSS_SLICE_IMPACT.md) | Cross-slice dependencies and consequences | COMPLETE |
| [PROOFS/README.md](PROOFS/README.md) | Capability proof index CAP-01 through CAP-08 | COMPLETE |
| [HANDOFF_STATUS.md](HANDOFF_STATUS.md) | Track document readiness and open blockers | IN_REVIEW |

---

## How to read this package

**Start with PRODUCT.md** — one page, tells you what the customer gets and why.  
**Then SYSTEM.md** — the entity model and invariants constrain everything downstream.  
**Then RECONCILIATION.md** — the four logical responsibilities map the system model to code locations.  
**Then CODE_REALITY_AUDIT.md** — what already exists, what needs promotion, what is genuinely new.  
**Then CROSS_SLICE_IMPACT.md** — Q1/B-02 and Q8/B-03 are Engineering inputs for Phase 10 (not pre-handoff blockers); Q2/Q10 closed; Q3/Q4 shared candidates; B-08 spans Design + Engineering.  
**Then UX.md** — what the user does at each step, and the 7 system states that back it.  
**UI.md** — read last; no accepted design yet.  
**PROOFS/README.md** — look up a capability to see what has been empirically proven and what has not.

---

## Engineering inputs for Phase 10 Implementation Design

These are open questions Yigal resolves in Phase 10. They are **not** blockers of the pre-handoff package or the ENGINEERING_REVIEW_READY state. They gate Phase 15 (Human Review).

| Input | Owner | Phase 10 topic |
|---|---|---|
| **Q1 / B-02** — `launch_contract.ts` state-aware start integration | Architecture + Engineering | WHERE the inventory-presence check lives and HOW dispatch integrates with `launch_contract.ts`; product behavior already decided |
| **Q8 / B-03** — ACL permissions mapping for SL-02 | Architecture + Engineering | Enterprise authorization mapping; not a local-prototype blocker |
| **P6** — 8 pre-existing git boundary violations in production code | Engineering | Reported in code reality audit; origin not fully located; resolution required before GA |

**GD-01 is CLOSED.** The three patch items (final diagrams, detailed sequence, entity model relationships) were applied to SYSTEM.md on 2026-09-08.

---

## FD-S01-A — NORMALIZED (not an open Founder decision)

**FD-S01-A** (`propperly start` state-aware dispatch vs new verb) is **STALE_DECISION_ALREADY_RESOLVED** — normalized 2026-09-08.

State-aware dispatch is adopted by V3.1 D10/D19 (the canonical System Design, READY FOR HUMAN REVIEW) and the PRODUCT.md product flow (APPROVED). Both halves of the question are resolved:
- State-aware dispatch: YES — V3.1 D10/D19 and PRODUCT.md product flow
- Namespaced verb (`propperly setup`): NOT FOR MVP — RECONCILIATION.md

The residue (WHERE the inventory check lives in `launch_contract.ts`) is tracked as Q1/B-02 — an Engineering input for Phase 10. Nothing is dropped.

---

## What Yigal should produce

An **Implementation Design** document covering:

1. Service / process allocation for R-1 through R-4
2. Data and persistence technology and schema
3. API and protocol choices (internal and external surfaces)
4. Locking / CAS mechanism for multi-process confirmation (CAP-08 top risk)
5. ACL/permission integration approach for Q8
6. Web Review Interface scope and UI handoff trigger
7. Build milestones and rollout sequence

The Implementation Design does NOT need to wait for UI.md to be complete for the backend components. The Web Review Interface (R-1 extension) may be phased.
