# SL-02 Source Discovery — Code Reality Audit

**Canonical source:** `propperly-local-poc/SLICE_01_CODE_REALITY_AUDIT.md` (48 KB)  
**Audit date:** 2026-09-07  
**Branch at audit:** `eee3378` ("freeze(foundation): sign PROPPERLY FOUNDATION BASELINE V1 at e59bc07")  
**Auditor:** Architecture — read-only, zero functional changes

This document is a condensed handoff view. For the complete audit including full target-vs-code matrix and implementation sequence recommendations, read the canonical source.

---

## Executive verdict

**READY FOR RECONCILIATION**

SL-02 is implementable on the current foundation. No major architectural rewrite is required. Approximately 65% of required production structure exists in proven spike form; a further 20% exists in production primitives that can absorb SL-02 responsibilities. One new module is genuinely missing: the Web Review Interface.

**The production path is promotion + hardening, not redesign.**

---

## Top 3 reconciliation risks

1. **`propperly start` verb conflict** — `propperly start` is unconditionally wired to `bootstrapAndConverge` (full reconstruction loop) at `src/cli/propperly.ts:1050`. SL-02 cannot reclaim this verb without breaking the production flow. Resolution requires state-aware conditional dispatch (recommended) or a new verb. *(FD-S01-A — normalized 2026-09-08: state-aware dispatch ADOPTED in V3.1 D10/D19; residue Q1/B-02 is Engineering input for Phase 10)*

2. **Multi-process confirmation CAS** — `appendFileSync` is POSIX-atomic for single-payload single-process use (proven). A serialized write boundary for concurrent writers is architecturally required but unimplemented. Must be resolved in Implementation Design before production.

3. **Web Review Interface is absent** — no existing production UI surface serves candidate review (include/exclude/resolve). Existing UIs serve reconstruction output, not pre-approval candidate review. This is the only component requiring net-new work.

---

## Current code map (production-relevant components)

| Component | Location | Role |
|---|---|---|
| CLI dispatcher | `src/cli/propperly.ts` | Command routing; `start` at line 1050 → `bootstrapAndConverge` |
| Full reconstruction bootstrap | `src/dev/analytics_start.ts:29` | `bootstrapAndConverge` — auto-discover → converge → MCP |
| Launch contract | `src/dev/launch_contract.ts` | Route constants, canonical launch plan, fixture guard |
| Local gateway security | `src/ui/local_gateway_security.ts` | `listenLocal` (127.0.0.1 only), `guardRequest` (CSRF), capability cookie |
| Onboarding server | `src/shell/onboarding_server.ts:203` | Founding-Beta wizard + home; spawns maintenance child |
| Local repo connector | `src/world/local_repo_connector.ts` | ALL Git mechanics (`execFileSync` confined here); `resolveLocalRepoIdentity`, `discoverLocalRepo` |
| Shell session discovery | `src/shell/session_discovery.ts` | `discoverForRoots()` — metadata-only; `searchSessions()` — loads bodies for search only |
| Folder picker | `src/shell/folder_picker.ts:20` | `pickFolderNative()` — OS dialog |
| Atomic write lib | `src/lib/atomic_write.ts` | `writeJsonAtomic` / `writeTextAtomic` — tmp+rename POSIX atomic |
| Platform path | `src/lib/platform_path.ts` | `isContained`, `HOST.impl` — cross-platform path containment authority |
| Enterprise policy | `src/enterprise/e1/audit.ts` | Exists; not connected to spike or SL-02 flows |
| Domain contract discover/approve | `src/domain_contract/onboard_cli.ts` | `runDiscover` / `runApprove` — Step-35 governance; **NOT SL-02** |

---

## Spike layer status

| File | Spike | Registered in canonical gate |
|---|---|---|
| `src/spike/source_access_spike.ts` | 01+02 | YES — `manifest.json:1830` |
| `src/spike/source_access_contract.ts` | 03 | YES — `manifest.json:1838` |
| `src/spike/session_discovery.ts` | 04 | YES — `manifest.json:1846` |
| `src/spike/source_identity.ts` | 05 | YES — `manifest.json:1854` |
| `src/spike/discovery_run.ts` | 06 | YES — `manifest.json:1862` |
| `src/spike/candidate_evidence.ts` | 07+08 | YES — `manifest.json:1878` |
| `src/spike/source_approval.ts` | 08 | YES — `manifest.json:1870` |
| `src/spike/candidate_store.ts` | 07+08 | **NOT REGISTERED** — no dedicated test |
| `src/spike/discovery_orchestrator.ts` | 06 | **NOT REGISTERED** — no dedicated test |

---

## Spike promotion verdicts

| File | Verdict | Key action |
|---|---|---|
| `source_access_spike.ts` | EXTRACT CONTRACT/PATTERN ONLY → DELETE | HTTP server scaffold; `inspectSourceCandidate` logic is the pattern; the spike server must not become production ingress |
| `source_access_contract.ts` | PROMOTE WITH MINOR HARDENING | Correct production seam; needs path-containment guard (`isContained`) |
| `session_discovery.ts` (spike) | PROMOTE WITH MINOR HARDENING | Needs `isContained` guard; keep separate from `shell/session_discovery.ts` |
| `source_identity.ts` | PROMOTE WITH MINOR HARDENING | Conservative grouping proven; document that `provider` is excluded from identity evidence |
| `discovery_run.ts` | PROMOTE WITH MINOR HARDENING | File structure correct; needs atomic write backing for `meta.json` updates |
| `discovery_orchestrator.ts` | PROMOTE WITH MINOR HARDENING + ADD TEST | Correct injected-ports pattern; **GATE: no test file registered in canonical gate** |
| `candidate_evidence.ts` | PROMOTE AS-IS | Four-dimension model is clean and correct; `project()` is a pure function |
| `candidate_store.ts` | PROMOTE WITH MINOR HARDENING | Append-only model correct; **GATE: not registered; needs test coverage and `atomic_write`** |
| `source_approval.ts` | PROMOTE WITH MINOR HARDENING | Confirmation semantics proven; **gap: multi-process serialization boundary must be added** |

**None of the spike files should be reused as-is in production without the stated hardening.** Green spike tests prove spike semantics, not production fitness.

---

## Reusable existing primitives (do not reimplement)

- `src/ui/local_gateway_security.ts` — `listenLocal` + `guardRequest` + capability cookie. Reuse as-is.
- `src/lib/atomic_write.ts` — `writeJsonAtomic` / `writeTextAtomic`. Wire to candidate store and confirmation log.
- `src/lib/platform_path.ts` — `isContained`. Add to `spike/session_discovery.ts` before promotion.
- `src/world/local_repo_connector.ts` — ALL Git mechanics. Do not duplicate; this is the R-2 production adapter for repos.
- `src/shell/session_discovery.ts:discoverForRoots()` — metadata-only session scan. Reuse as R-2 session adapter.

---

## Missing production pieces (genuine gaps)

1. **Web Review Interface** — candidate list, include/exclude/resolve UI, confirmation trigger. No existing UI surface serves this. Host inside `onboarding_server`. Only net-new component requiring UI work.

2. **Path-containment guard in source discovery** — `isContained` check from `platform_path.ts` not wired into `spike/session_discovery.ts`. One-line fix; must be added before promotion.

3. **`discovery_orchestrator.ts` canonical test** — no test file; not registered in manifest. Must exist before promotion.

4. **`candidate_store.ts` canonical test** — not registered in manifest. Must exist before promotion.

5. **Confirmation serialization boundary** — multi-process write safety for `confirmation_log.ndjson`. Design decision required; no code yet.

6. **CLI verb resolution** — the `propperly start` conflict and the `discover`/`approve` verb collision with domain-contract flow. Naming decision, not a code gap.

7. **Enterprise policy wire-up** — `src/enterprise/e1/audit.ts` not connected to source discovery. Not a local-prototype blocker; required before enterprise GA.

---

## Implementation risk register

| Risk | Probability | Impact | Evidence | Mitigation |
|---|---|---|---|---|
| `propperly start` verb conflict causes wrong-path invocation | HIGH | HIGH | `src/cli/propperly.ts:1050` — unconditional dispatch | Resolve naming decision before implementation |
| Multi-process confirmation write corruption | LOW (local-first single-process) | HIGH | `source_approval.ts` — no write lock | Specify single-writer invariant explicitly; design lock if topology requires |
| `discovery_orchestrator.ts` behavioral regression at promotion (no test baseline) | MEDIUM | MEDIUM | Not registered in manifest | Add test before promotion; cover policy snapshot, resume, idempotency |
| Path traversal via unchecked session `cwd` locator | LOW | MEDIUM | `spike/session_discovery.ts` — no `isContained` guard | Add `isContained` before production |
| Web Review Interface scope creep | HIGH | MEDIUM | No spike coverage; undefined scope | Bound to: list candidates, include/exclude, confirm. Nothing else for SL-02. |
| Session discovery scope violation (transcript read leaks into SL-02) | LOW | HIGH | `shell/session_discovery.ts:130` has `loadSession` in search path | Keep SL-02 wired to promoted spike path only; never wire to `searchSessions` |
| Enterprise policy not wired — source inventory bypasses admin upper bound | MEDIUM (enterprise) | HIGH | `enterprise/e1/audit.ts` not connected | Not a local-prototype blocker; document as pre-enterprise-GA requirement |
| Naming collision: `propperly discover` / `propperly approve` | HIGH | MEDIUM | `domain_contract/onboard_cli.ts` owns these verbs | Choose distinct SL-02 verbs |

---

## Boundary violations (P6)

**Status: UNSUPPORTED from this ref.**

The audit references "8 known Git boundary violations in production code." The origin was not located from `eee3378`. Some `child_process` usages in the codebase may not be Git. Resolution required before GA; should be scoped in Engineering's review.

---

## What is NOT in scope for Code Reality Audit

- Deployment topology assessment (logical only)
- Enterprise ACL integration design
- Web Review Interface design (DESIGN_NOT_STARTED)
- Implementation sequence decisions (those are Yigal's Implementation Design)
