# Propperly Engineering Handoffs

This repository contains the engineering-facing handoff packages for each Propperly Product Slice.

Each Slice package is the input to Engineering Implementation Design.

---

## Ownership model

**Product / Architecture track owns:**
- Product contract
- System contract
- UX
- UI contract (when available)
- Technical proofs
- Code-reality audit
- Reconciliation
- Cross-slice implications

**Yigal / Engineering owns:**
- Implementation Design
- Concrete Service / Runtime allocation
- Concrete Data & Persistence design
- Production module / interface design
- Concurrency / locking mechanics
- Build plan
- Implementation
- Implementation verification

---

## Current Slices

Canonical architecture source commit: `f6e3697`

| Slice | Engineering Review Ready | Final Handoff Ready | Engineering may begin |
|---|---|---|---|
| [SL-01 — Workspace Setup](sl-01-workspace-setup/README.md) | **YES** | NO (UI + GD-01 pending) | **YES** |
| [SL-02 — Source Discovery](sl-02-source-discovery/README.md) | **YES** | NO (UI pending) | **YES** |

**Note on FINAL_HANDOFF_READY = NO:**
This does NOT prevent Engineering from beginning Implementation Design for either slice.
Remaining gaps: UI Design track (both slices) + GD-01 format items for SL-01.
Start with each slice's `README.md` for reading order and Engineering inputs.

---

## What is not in this repository

Working architecture history, research, production source code, and worktrees are intentionally
excluded. This repository is a publication surface for engineering handoff packages only.

Canonical architecture source evidence referenced in handoff documents exists in the
Propperly architecture repository.
