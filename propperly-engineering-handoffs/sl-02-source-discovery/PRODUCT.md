# SL-02 Source Discovery — Product

**Source:** Propperly Product Operating Map (canonical)  
**Status:** APPROVED — no open product decisions  
**Slice:** SL-02 (working dir: `architecture/slices/slice-01-source-discovery/`)

---

## Customer outcome

> A first-time Propperly user completes a guided source discovery session and ends with an **Approved Source Inventory** — a named, verified set of sources that Propperly is authorized to reconstruct from.

Without this slice, there is no first-run experience. The product has no way to know what to reconstruct from, and the reconstruction engine has no authorized input.

---

## Product flow

SL-02 is the **first-run gate** in the Propperly product:

```
First run
    │
    ▼
SL-02: Source Discovery + Approval
    │  User: identifies, reviews, and confirms sources
    │  Output: Approved Source Inventory
    │
    ▼
SL-03+: Source Management (add/remove/update after initial approval)
    │
    ▼
Reconstruction (existing: bootstrapAndConverge)
    │  Input: Approved Source Inventory
    │  Output: reconstructed world
```

The **Approved Source Inventory** is the authority boundary. Nothing in the reconstruction flow runs before it exists.

---

## User journey (summary — see UX.md for full state model)

| Step | What happens |
|---|---|
| **Start** | User launches Propperly on a fresh install. System detects no Approved Source Inventory. Discovery wizard opens in browser. |
| **Find** | System discovers recent sources from session metadata. User sees candidates — each tagged with availability, support status, and identity notes. |
| **Review** | User reviews candidates one by one. Includes or excludes each. Resolves identity ambiguities (merge / keep separate). |
| **Decide** | User finalizes the selection. System presents the proposed inventory. |
| **Confirm** | User explicitly confirms. System writes the Approved Source Inventory (authority transition). |
| **Continue** | Propperly proceeds to reconstruction with the approved inventory as input. |

---

## What the product guarantees

1. **No ingestion before authorization.** No source is semantically ingested until it appears in a confirmed inventory. Discovery is metadata-only.
2. **Human selection is never automated.** The system proposes; the human decides. INCLUDED status alone does not create a Source.
3. **Empty confirmation is valid.** A user may confirm with no sources included — a valid starting state.
4. **Confirmation is idempotent.** Re-running confirmation with the same request produces the same result without creating a duplicate inventory.
5. **Returning users are unaffected.** Once an Approved Source Inventory exists, `propperly start` routes to reconstruction as today.

---

## Product decisions already made (closed)

| Decision | Resolution |
|---|---|
| Empty confirmation valid? | YES — per founder decision. Product UX may prevent progression, but the authority state is valid. |
| Selection automated? | NO — selection (INCLUDED/EXCLUDED) is always human. |
| Ingestion boundary | Session discovery is metadata-only. `scanLocalRepoIntoWorld` is post-approval only. |
| On-prem constraint | All discovery and confirmation runs locally. No cloud transmission of source identity. (ADL-005) |
| **FD-S01-A** — `propperly start` state-aware dispatch vs new verb | State-aware dispatch ADOPTED — V3.1 D10/D19 and product flow above. `propperly start` is the single entry; system detects inventory presence and routes accordingly. Namespaced verb NOT FOR MVP. Normalized 2026-09-08. |

---

## Product decisions still open

No open product decisions. Yigal may begin Implementation Design with this product intent as stable input.

*Note: The HOW question (WHERE the inventory-presence check lives in `launch_contract.ts`) is an Engineering implementation design question tracked as Q1/B-02 — not a Product decision.*
