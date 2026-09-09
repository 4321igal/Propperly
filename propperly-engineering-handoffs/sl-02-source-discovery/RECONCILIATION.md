# SL-02 Source Discovery — Reconciliation

**Canonical source:** `propperly-local-poc/SLICE_01_RECONCILIATION.md` (27 KB)  
**Status:** COMPLETE

This document reconciles the system design with code reality and produces the four canonical production responsibilities for SL-02. It resolves the key decisions that shape Implementation Design.

**These are logical responsibilities, not microservices.** Service/process/module decomposition is Yigal's Implementation Design task.

---

## The four reconciled responsibilities

### R-1: Local Application Shell *(EXISTING, extended)*

**What it owns:** CLI dispatch, HTTP host (`onboarding_server`), browser handoff, loopback security (CSRF, capability cookie, path containment). SL-02 extends this with new API routes (`/api/shell/sources/*`) and a candidate review UI panel inside the existing server.

**No new server. No new port. No new security layer.**

**Code:**
- `src/cli/propperly.ts` — CLI dispatch (state-aware dispatch to be added; see FD-S01-A)
- `src/shell/onboarding_server.ts` — HTTP host; new routes added here
- `src/ui/local_gateway_security.ts` — security layer, unchanged

---

### R-2: Source Access *(EXISTING + promoted)*

**What it owns:** typed interface for accessing a source at a locator. Implementations for local repo (Git metadata), folder (stat/walk), and session-metadata. Does NOT own discovery orchestration, candidate logic, or approval.

**Interface:** `inspectSourceCandidate(locator, kind) → SourceAccessResult` — single typed seam; all Git/filesystem mechanics confined here.

**Existing (reuse as-is):**
- `src/world/local_repo_connector.ts` — Git mechanics (all `execFileSync` confined here)
- `src/lib/platform_path.ts` — path containment authority (`isContained`)
- `src/shell/session_discovery.ts` — metadata-only bounded scan (`discoverForRoots`)

**Promote:**
- `src/spike/source_access_contract.ts` → production as the unified typed seam (`inspectSourceCandidate`)

**Discard:**
- `src/spike/source_access_spike.ts` — HTTP server scaffold (proof done; architecture must not be retained)
- `src/spike/session_discovery.ts` — redundant; `shell/session_discovery.ts` is the production layer

---

### R-3: Source Discovery + Candidates *(NEW, promoted from spikes)*

**What it owns:** DiscoveryRun lifecycle (`meta.json` / `evidence.ndjson` / `decisions.ndjson` / `run.log`), four-dimension candidate model (availability, support, identity, selection — always independent), identity grouping (R1–R4 rules), orchestration of R-2 access adapters.

**Promote (with hardening):**
- `src/spike/discovery_run.ts` — `DiscoveryRunStore`; needs atomic write backing for `meta.json`
- `src/spike/candidate_evidence.ts` — four-dimension model + pure `project()` function; promote as-is
- `src/spike/candidate_store.ts` — append-only `evidence.ndjson` / `decisions.ndjson`; **GATE: must register + add test before build**
- `src/spike/source_identity.ts` — `groupReferences()` + `resolveIdentityRelation()`; minor hardening
- `src/spike/discovery_orchestrator.ts` — injected-ports `OrchestratorCapabilities` pattern; **GATE: must add test + register before build**

**Do NOT reuse `src/runs.ts`** — different domain (reconstruction run management).

---

### R-4: Approval Authority *(NEW, promoted from spike)*

**What it owns:** explicit human confirmation, Approved Source Inventory, idempotent confirmation with `inventory_version` + `review_revision` guards, optimistic concurrency check at confirmation time.

**Promote (with hardening):**
- `src/spike/source_approval.ts` — `commitConfirmation()`, `getInventory()` fold, `computeReviewRevision()`

**Wire:**
- `src/lib/atomic_write.ts` (`writeTextAtomic` / `writeJsonAtomic`) to `confirmation_log.ndjson` — not yet wired in spike; required before production

**Key invariant:** `INCLUDED` status in R-3 does not create a Source. The authority transition occurs only at R-4 confirmation.

---

## Key decisions resolved by reconciliation

### CLI and bootstrap

| Question | Resolution |
|---|---|
| Should `propperly start` become state-aware? | YES (recommended) — one entry verb, routes on inventory presence |
| Must existing reconstruction flow remain reachable? | YES — state-aware dispatch preserves the existing path |
| Is current `propperly start` → `bootstrapAndConverge` correct for fresh install? | NO — fresh install has no inventory; dispatch fix required |
| Do `discover`/`approve` verbs stay owned by Step-35 domain-contract flow? | YES — SL-02 does not need top-level CLI verbs; browser wizard is the surface |
| Does SL-02 need a namespaced verb (e.g., `propperly sources start`)? | NOT FOR MVP — add post-MVP without breaking compatibility |

**Recommended CLI change:** State-aware dispatch at `src/cli/propperly.ts:1050`:
```
if (no Approved Source Inventory at PROPPERLY_HOME) → open source discovery wizard (SL-02)
else → existing bootstrapAndConverge path
```
Precedent exists at `src/cli/propperly.ts:~1057` (`propperly project` already does this conditional dispatch pattern).

**FD-S01-A — NORMALIZED (STALE_DECISION_ALREADY_RESOLVED, 2026-09-08):** State-aware dispatch is adopted — V3.1 D10/D19 and PRODUCT.md product flow (APPROVED). Namespaced verb NOT FOR MVP. The remaining question (WHERE the inventory check lives in `launch_contract.ts`) is tracked as Q1/B-02 — Engineering input for Phase 10.

---

### Source Access

**Chosen: Option A — promote `source_access_contract.ts` as the typed seam; keep existing production adapters; add path-containment guard.**

- `local_repo_connector.ts` stays as the production Git adapter (all `execFileSync` confined here)
- `shell/session_discovery.ts:discoverForRoots()` stays as the session adapter (metadata-only)
- `spike/source_access_contract.ts` becomes the typed dispatch seam (`inspectSourceCandidate`)
- `isContained` from `platform_path.ts` must be added to source discovery before promotion

---

### Session discovery ownership

The spike `session_discovery.ts` and shell `session_discovery.ts` both perform session discovery, but for different purposes:

- `shell/session_discovery.ts:searchSessions()` loads session bodies for search — **must NOT be wired into SL-02**
- `shell/session_discovery.ts:discoverForRoots()` is metadata-only — **use as the production R-2 adapter**
- `spike/session_discovery.ts` — **DISCARD** after confirming `discoverForRoots()` meets the need

---

### Web Review Interface hosting

**Chosen:** Extend `onboarding_server.ts` with new routes. No new process. No new port.

The Candidate Review Interface (S3/S4) is new routes inside R-1, not a new server. SL-02 completes entirely within the existing local security model.

---

### Confirmation serialization

**For local single-process deployment:** `appendFileSync` is sufficient (POSIX-atomic for single-payload). The single-writer invariant must be documented as an explicit constraint.

**For multi-process deployment:** A serialized write boundary must be designed in Implementation Design (CAP-08 top risk). Yigal owns this decision for the production topology.

---

## Open reconciliation decisions (Yigal's input required)

| Question | Who decides | Why |
|---|---|---|
| File-based vs server-mediated confirmation — if concurrent CLI + UI confirmation is realistic, is `appendFileSync` sufficient or must confirmation route through the server? | Engineering | Depends on deployment topology |
| Allowed-roots policy scope — how broad should the initial OS-path permission boundary be? | Engineering + Architecture | Intersects with enterprise policy contract |
