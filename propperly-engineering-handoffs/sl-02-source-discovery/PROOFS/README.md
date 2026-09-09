# SL-02 Source Discovery — Capability Proof Index

**Canonical source:** `architecture/slices/slice-01-source-discovery/system/SLICE_01_SOURCE_DISCOVERY_SYSTEM_V3_1.md` Appendix B (lines 637–693)  
**Evidence artifacts:** Spike 01–08 in `propperly-local-poc/src/spike/`

The capability names used here (CAP-01 through CAP-08) map 1:1 to the Appendix B spike numbers (B.1–B.8) and to the spike files in `src/spike/`. Both naming schemes refer to the same proofs.

---

## CAP-01 — Local Repository Access

**Spike:** B.1 / `source_access_spike.ts` + `source_access_contract.ts`  
**Status:** PROVEN

**What was proven:** A browser-facing experience can identify a local repository through a bounded, replaceable Source Access capability without cloud execution or UI-owned Git mechanics. Cases: valid Git repo with remote; repo without remote; nonexistent path; non-Git directory; UI/application boundary checks; offline/local execution; restart.

**What was NOT proven:** Production auth/hardening and exact deployment topology. Branch-name metadata extraction beyond what is needed to establish the architectural seam.

**Relevant code:** `src/spike/source_access_contract.ts` (inspectSourceCandidate seam); `src/world/local_repo_connector.ts` (production Git mechanics — reuse as-is)

---

## CAP-02 — Local Folder Access

**Spike:** B.2 / `source_access_spike.ts`  
**Status:** PROVEN

**What was proven:** Folder access fits the same Source Access responsibility without a competing path. Cases: valid directory; missing path; file-not-directory; permission denied; Git repo treated as folder without Git mechanics; metadata-only inspection; shared Source Access pattern.

**What was NOT proven:** OS readability is a technical fact; it is not Propperly authorization. No authorization boundary proven here.

**Relevant code:** `src/spike/source_access_contract.ts` (same seam as CAP-01)

---

## CAP-03 — Application → Source Access Contract

**Spike:** B.3 / `source_access_contract.ts`  
**Status:** PROVEN

**What was proven:** A small explicit dispatch seam is sufficient for current source types. Application logic routes inspection by declared intent without knowing Git/filesystem mechanics. Cases: repo and folder both route through one exported inspection function; unknown kinds fail explicitly; no heuristic kind inference; no source mechanics above seam; metadata-only result.

**What was NOT proven:** Declared repo against a plain directory can surface observed-kind mismatch; the mismatch is explicit rather than silently hidden — the handling of this case in production UX is undesigned.

**Relevant code:** `src/spike/source_access_contract.ts:1` — production seam; promote with path-containment guard added

---

## CAP-04 — Recent Session Discovery

**Spike:** B.4 / `session_discovery.ts` (spike)  
**Status:** PROVEN (local session-provider pattern only)

**What was proven:** Bootstrap discovery from recent analyst work without semantic ingestion or source-kind invention. Only allowlisted session fields/signals produce source references; missing evidence yields UNKNOWN, not invented classification. Cases: bounded enumeration, provider encoding, no source-kind invention, positive/behavioral body-field allowlist falsification, preserved reference provenance.

**What was NOT proven:** Additional session providers and their exact formats. The proof does not claim universal session-provider coverage. Symlink equivalence, provider-host disambiguation, case normalization are not covered.

**Relevant code:** `src/spike/session_discovery.ts` (promote with `isContained` guard); `src/shell/session_discovery.ts:discoverForRoots()` (production metadata-only scan — use this for R-2, not the spike)

---

## CAP-05 — Conservative Source Identity

**Spike:** B.5 / `source_identity.ts`  
**Status:** PROVEN with limits

**What was proven:** Conservative grouping/relations work without fuzzy auto-merge. Ordered deterministic evidence hierarchy: contradictory external identity → DIFFERENT; exact normalized locator → SAME_LOCATOR; same owner/name at different locators → AMBIGUOUS; missing/weak evidence → AMBIGUOUS. No fuzzy scoring. Cases: exact/equivalent locator, contradictory remotes, multiple clones, no-remote repos, moved-looking paths, basename near-misses, provenance preservation, human-authority preservation.

**What was NOT proven:** Symlink equivalence, provider-host disambiguation, case normalization, rename/fork/mirror semantics. These remain unresolved implementation/research details.

**Relevant code:** `src/spike/source_identity.ts:1` — groupReferences(), resolveIdentityRelation(); note `provider` is excluded from identity evidence at `:37` (carry this forward)

---

## CAP-06 — DiscoveryRun Orchestration

**Spike:** B.6 / `discovery_run.ts` + `discovery_orchestrator.ts`  
**Status:** PROVEN

**What was proven:** Durable orchestration does not require a workflow framework. Bounded discovery with durable progress, restart/resume, per-item failure, retry safety, no duplicate work. Cases: new run, incremental persistence, interruption/restart, resume, work-unit idempotency, duplicate locator provenance, item failure, retry, cancellation, policy snapshot, separate-process reload.

**What was NOT proven:** Production storage technology and operational backoff/timing values. Exact module/file promotion sequence.

**Relevant code:** `src/spike/discovery_run.ts:41` (DiscoveryRunStore); `src/spike/discovery_orchestrator.ts` (OrchestratorCapabilities pattern)  
**GATE:** `discovery_orchestrator.ts` has no canonical test file and is not registered in manifest. Must add test before promotion.

---

## CAP-07 — Candidate Evidence and Review

**Spike:** B.7 / `candidate_evidence.ts` + `candidate_store.ts`  
**Status:** PROVEN

**What was proven:** The four-dimensional candidate model holds and remains rebuildable without a projection-state file. Append-only evidence and selection-decision logs; deterministic projection rebuilt from evidence. Cases: incremental persistence, immutable prior records, deterministic replay, independent dimension changes, decision reversal, multi-candidate isolation, ambiguity relation, provenance merge, subprocess restart.

**What was NOT proven:** This is pre-approval state only; it does not create Source authority.

**Relevant code:** `src/spike/candidate_evidence.ts:26` (four-dimension model, pure project()); `src/spike/candidate_store.ts` (evidence.ndjson / decisions.ndjson)  
**GATE:** `candidate_store.ts` is not registered in canonical gate; no dedicated test. Must add test before promotion.

---

## CAP-08 — Approval / Inventory Authority

**Spike:** B.8 / `source_approval.ts`  
**Status:** PROVEN at single-writer semantic level — **MULTI-PROCESS CAS UNPROVEN (top reconciliation risk)**

**What was proven:** Confirmation is the sole SL-02 authority transition. `INCLUDED` alone does not create a Source. Cases: initial confirmation, no authority from INCLUDED alone, exact retry/restart replay, stale inventory conflict, stale review conflict, serialized concurrent confirmation, failure before commit, crash after commit, multi-ref atomic logical commit, evidence immutability.

**What was NOT proven:** True multi-process mutual exclusion / CAS. The production atomic/serialized mechanism must be selected in Implementation Design. `appendFileSync` is POSIX-atomic for single payloads (≤ PIPE_BUF) — correct for single-process; insufficient for concurrent multi-process writes.

**Relevant code:** `src/spike/source_approval.ts` (commitConfirmation(), getInventory() fold, computeReviewRevision(), request_id idempotency)

**Top risk for Implementation Design:** Yigal must explicitly choose the confirmation serialization mechanism (single-writer invariant + documentation, or a write lock / server-mediated serialization). This cannot be deferred past Implementation Design.
