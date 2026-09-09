# SL-02 Source Discovery — Software Application Design (Stage 1)

**Author:** Yigal / Engineering
**Input package:** [`sl-02-source-discovery/`](../sl-02-source-discovery/README.md) (Architecture handoff, ENGINEERING_REVIEW_READY = YES, 2026-09-08)
**Target codebase:** this monorepo's six-service skeleton (`app/`, `services/`, `engine/`, `data-center/`, `storage/`, `mcp/`) — **not** the legacy `propperly-local-poc` codebase the handoff package's code references point at
**Code location:** all Stage 1 implementation code lives under [`services/discovery/`](../../services/discovery/README.md)
**Status:** DRAFT — Yigal's Implementation Design, not yet architecture-reviewed

---

## 0. Scope assumption (read this first)

The handoff instruction that triggered this document was cut off mid-sentence:
*"In the first stage the service will be in ⟨…⟩ development, which includes all ⟨…⟩."*

This document interprets that as:

> **Stage 1 = a standalone, self-contained module.** All four logical responsibilities
> (R-1 shell extension, R-2 Source Access, R-3 Discovery, R-4 Approval Authority) are
> implemented together, in-process, inside `services/discovery`. Nothing depends on
> `engine/` or `data-center/`, which are still empty skeletons with no RPC surface to
> call. Persistence is local files, not a database.

This reading is consistent with three things already in the handoff package: (a)
RECONCILIATION.md's own recommendation that `appendFileSync` local-file confirmation is
"sufficient for local single-process deployment," (b) CODE_REALITY_AUDIT.md's framing
that SL-02 is "promotion + hardening, not redesign" of exactly this kind of local
module, and (c) the instruction to put *all* code for this project under one folder.
If this isn't what was meant, the rest of the document is still structurally valid —
only §3 (process allocation) and §5 (persistence) would need to change.

---

## 1. What SL-02 is, in one paragraph

SL-02 is the first-run gate: a user with no **Approved Source Inventory** launches
`propperly start`, gets routed into a discovery wizard instead of the reconstruction
engine, reviews candidate sources the system found (metadata only — nothing is read
semantically), includes or excludes each one, resolves identity ambiguity by hand, and
explicitly confirms. That confirmation is the only event in the whole system that
creates authorized `Source` records. Everything before it is proposal; nothing after it
runs without it. Returning users (inventory already exists) never see this flow —
`propperly start` routes straight to `bootstrapAndConverge` as it does today.

---

## 2. Mapping onto the six-service skeleton

The handoff's four logical responsibilities (R-1–R-4) were written against the old POC's
flat `src/` layout. This repo's skeleton draws different boundaries (`app` / `services` /
`engine` / `data-center` / `storage` / `mcp`), so the mapping needs to be made explicit
rather than assumed.

| Handoff responsibility | Owns | Stage 1 home | Long-term home (this skeleton) |
|---|---|---|---|
| R-1 Local Application Shell | CLI dispatch, HTTP host, browser handoff, loopback security | `services/discovery` exposes the routes; **CLI dispatch itself is out of Stage 1 scope** — no `propperly` CLI exists yet in this skeleton | `app/` (UI/HTTP host) + a future CLI entry point calling `services` |
| R-2 Source Access | Typed source inspection (`inspectSourceCandidate`) | `services/discovery/source-access` — local repo (Git), folder, session adapters | Unchanged — this is inherently local-machine code; stays wherever the shell process runs |
| R-3 Discovery + Candidates | DiscoveryRun lifecycle, four-dimension candidate model, identity grouping | `services/discovery/discovery` — local files under a workspace-relative directory | `engine/` once Engine has a real RPC surface (candidate evidence *is* semantic-adjacent state, so it's a reasonable Engine candidate later — not decided here) |
| R-4 Approval Authority | Confirmation, `SourceInventory`, idempotency | `services/discovery/approval` | `data-center/` once it exists (SourceInventory is exactly "Governed World" persistence per the root README's model) |

**Consequence:** Stage 1 deliberately does *not* honor the skeleton's `services → engine
(RPC) → data-center` chain, because the target it would call is empty. That's an
accepted, temporary architectural debt, not an oversight — see §9 for the migration
path.

`app/` is not touched in Stage 1. The Web Review Interface (browser UI) has no design
artifact yet (UI.md: `PENDING DESIGN TRACK`) and its only Stage 1 deliverable is the API
surface it will eventually call (§6).

---

## 3. Service / process allocation

**Stage 1: one process.** `services/discovery` runs inside the existing `services`
Node process (see `services/src/index.ts`) as an internal module — not a new server, not
a new port, matching R-1's own constraint in the handoff ("No new server. No new port.
No new security layer.").

Internal module boundaries (mirroring R-1–R-4, so the eventual split in §9 is a
lift-and-shift, not a rewrite):

```
services/discovery/
├── source-access/     R-2 — inspectSourceCandidate(locator, kind)
├── discovery/          R-3 — DiscoveryRun, candidate evidence, identity grouping
├── approval/            R-4 — confirmSourceInventory, SourceInventory, receipts
└── routes/                R-1 extension — /api/discovery/* HTTP handlers
```

Each folder exposes one typed entry point to the others; nothing reaches into another
folder's internals. This is the same seam discipline the handoff package already proved
out in the spike layer (`inspectSourceCandidate` as R-3's only door into R-2).

---

## 4. Entities and state (carried over, not redesigned)

The 9-entity model from SYSTEM.md is adopted as-is — it's marked READY FOR HUMAN REVIEW
and nothing about the skeleton port changes the semantics:

`Workspace`, `WorkspaceState`, `DiscoveryRun`, `SourceCandidate`, `IdentityEvidence`,
`CandidateDisposition`, `Source`, `SourceInventory`, `ConfirmationReceipt`.

Same four independent `SourceCandidate` dimensions (`availability`, `support`,
`identity`, `selection`), same rule that `selection` is human-only and never inferred.
Same five system invariants (no ingestion before authorization; `INCLUDED` ≠ Source
creation; evidence is append-only; ambiguity is preserved, not auto-resolved;
confirmation is idempotent). See SYSTEM.md for the full definitions — this document
does not repeat them, only decides how they're physically implemented.

---

## 5. Data & persistence design (Stage 1)

**No database.** Stage 1 uses local files under a workspace-relative directory —
`WORKSPACE_HOME` (this skeleton's equivalent of the old POC's `PROPPERLY_HOME`; the
exact env var / config key is a five-minute decision left to whoever wires
`services/src/index.ts`, not worth blocking this document on).

```
<WORKSPACE_HOME>/discovery/
├── runs/<run_id>/
│   ├── meta.json            DiscoveryRun status, policy snapshot, restart/resume state
│   ├── evidence.ndjson      IdentityEvidence — append-only
│   ├── decisions.ndjson     CandidateDisposition — append-only
│   └── run.log
├── inventory/
│   ├── inventory.json       current SourceInventory head (versioned)
│   └── confirmation_log.ndjson   ConfirmationReceipt — append-only, idempotency source of truth
```

- `meta.json` / `inventory.json`: written via `writeJsonAtomic` (tmp+rename) — this
  primitive already exists in the handoff's reusable-primitives list
  (`src/lib/atomic_write.ts` in the old POC) and should be ported into
  `services/discovery` rather than reimplemented.
- `evidence.ndjson` / `decisions.ndjson` / `confirmation_log.ndjson`: append-only via
  `appendFileSync`. This is POSIX-atomic for a single payload ≤ `PIPE_BUF` and is
  correct **for single-process Stage 1 only** — see §7 for why this doesn't extend to
  multi-process.
- All candidate/inventory *state* is a deterministic projection folded from the
  append-only logs at read time — no separate mutable "current state" file, per
  ADL-002/Invariant 3. This also means Stage 1 has no migration risk if the projection
  logic changes: replaying the logs re-derives it.
- **Location is configurable**, not hardcoded, per CROSS_SLICE_IMPACT.md Q4 — no
  retention policy is defined yet; that's explicitly deferred to a later slice, and
  Stage 1 must not assume these files live forever.

---

## 6. API / protocol design

**External surface (Stage 1):** REST, extending the `ServicesApi` contract in
`services/CONTRACT.md`. This is what a future `app/` Web Review Interface — or the
current no-op CLI — would call.

```ts
interface DiscoveryApi {
  // R-3
  startDiscoveryRun(policy: DiscoveryPolicy): Promise<{ run_id: string }>;
  getDiscoveryRun(run_id: string): Promise<DiscoveryRunView>;          // candidates + status
  recordCandidateSelection(run_id: string, candidate_ref: string, selection: "INCLUDED" | "EXCLUDED"): Promise<void>;
  resolveIdentity(run_id: string, refs: string[], relation: "SAME" | "DIFFERENT"): Promise<void>;
  addCandidateByPath(run_id: string, path: string, kind: SourceKind): Promise<void>;

  // R-4
  getProposedInventory(run_id: string): Promise<ProposedInventoryView>;
  confirmSourceInventory(input: {
    run_id: string;
    refs: string[];
    expected_inventory_version: string;
    expected_review_revision: string;
    request_id: string;
  }): Promise<ConfirmationReceipt>;

  // R-1 extension
  getWorkspaceState(): Promise<{ has_approved_inventory: boolean }>;
}
```

Route prefix follows the handoff's own naming (`/api/shell/sources/*` in the old POC) —
here that becomes `/api/discovery/*`, hosted by whatever process ends up serving
`services`' HTTP surface.

**Internal seam (R-3 → R-2, unchanged from the handoff):**

```ts
inspectSourceCandidate(locator: string, kind: SourceKind): Promise<SourceAccessResult>;
```

Single typed dispatch point. All Git/filesystem mechanics stay behind it — R-3 never
touches `execFileSync` or the filesystem directly.

**Not designed here:** the CLI (`propperly start` state-aware dispatch, Q1/B-02) — this
skeleton has no CLI yet, so there is nothing to integrate against. `getWorkspaceState()`
above is the hook a future CLI or `launch_contract.ts`-equivalent would call; that's as
far as Stage 1 goes on that question.

---

## 7. Locking / concurrency (CAS)

**Stage 1 decision: single-writer invariant, explicitly documented, not enforced by a
lock.** `services/discovery` is the only process that writes these files. This matches
CAP-08's proven boundary exactly — "PROVEN at single-writer semantic level," multi-process
CAS explicitly unproven.

This is a real constraint, not a placeholder: if a second writer (a second CLI instance,
a second server process) ever touches the same `WORKSPACE_HOME/discovery/` tree
concurrently, correctness is not guaranteed. `appendFileSync`'s atomicity only protects a
single payload write, not read-modify-write sequences like `confirmSourceInventory`'s
version check.

**Deferred, not solved:** if/when this needs multi-process safety (e.g. CLI and browser
UI confirming concurrently), the options are (a) route all writes through the one
`services` process so the app never touches the files directly — cheapest, and already
true in Stage 1's design since REST is the only write path — or (b) a real file lock /
serialized write queue if a second writer process is ever introduced. Because Stage 1
already funnels all writes through one HTTP API in one process, (a) is free — the risk
only materializes if a second process is added later without going through this API.

---

## 8. ACL / permissions (Q8/B-03)

**Not implemented in Stage 1.** `src/enterprise/e1/audit.ts` (old POC) has no equivalent
in this skeleton yet, and per CROSS_SLICE_IMPACT.md this is explicitly "not a
local-prototype blocker." Stage 1 assumes a single local user with full access to their
own workspace, same as every other placeholder service in this repo. The only thing worth
fixing now, cheaply, is not designing anything that would make adding an authorization
check later expensive — i.e., all writes go through the `DiscoveryApi` surface above
(§6), never a bypass path, so a future ACL check has exactly one place to sit.

---

## 9. Web Review Interface — scope and handoff trigger

UI.md is `PENDING DESIGN TRACK`; per the handoff, Engineering is not blocked on it and
should design the API the future UI will consume, not wait. §6 (`DiscoveryApi`) *is*
that API surface — it is scoped to exactly the seven UX requirements in UX.md's "what it
must do" list (list candidates with all four dimensions, include/exclude, identity
conflict + resolution, add-by-path, inventory summary, confirmation trigger) and
deliberately excludes source management, reconstruction config, and analytics, per
UX.md's explicit "must NOT do" list.

**Trigger for handing this to the Design track:** `DiscoveryApi` as specified in §6 is
stable enough today to hand to Design — it does not need Stage 1 code to exist first.
Recommend flagging this document to Architecture/Design as unblocking B-08.

---

## 10. Migration path out of Stage 1 (not built now, just planned)

So Stage 1's shortcuts are legible later:

| Stage 1 shortcut | Future direction | Trigger to revisit |
|---|---|---|
| Everything in one `services` process | R-3/R-4 move behind `engine`/`data-center` RPC once those have real implementations | `engine`/`data-center` leave skeleton status |
| Local files, no DB | `SourceInventory` → Data Center (Governed World); `DiscoveryRun`/evidence logs likely stay local/Storage-referenced | Data Center schema design begins |
| Single-writer, no lock | Serialized write queue or route all writers through one API process | A second writer process is introduced |
| No ACL | Wire `Q8/B-03` mapping once an enterprise policy model exists in this skeleton | Enterprise GA work starts |
| No CLI integration | `getWorkspaceState()` becomes the state-aware dispatch hook for `propperly start` (Q1/B-02) | CLI entry point is built |

---

## 11. Build milestones (Stage 1)

1. **M1 — Source Access.** `source-access/`: `inspectSourceCandidate` seam, local-repo
   (Git) adapter, folder adapter, session-metadata adapter (bounded, metadata-only), path
   containment guard. No orchestration yet.
2. **M2 — Discovery.** `discovery/`: `DiscoveryRun` lifecycle + store (atomic
   `meta.json`), candidate evidence model (four dimensions, pure projection function),
   append-only evidence/decision stores, identity grouping (conservative rules), and the
   orchestrator wiring R-2 adapters in. Tests for orchestrator and candidate store are a
   **gate**, not a follow-up — the handoff explicitly flags both as unregistered/untested
   in the source they were promoted from.
3. **M3 — Approval.** `approval/`: `confirmSourceInventory`, inventory fold, review
   revision computation, idempotent receipt log wired to atomic/append-only writes.
4. **M4 — Routes.** `routes/`: `/api/discovery/*` implementing `DiscoveryApi` (§6) over
   M1–M3.
5. **M5 — Hand off to Design.** Publish `DiscoveryApi` to Architecture/Design as the
   unblock for B-08 (Web Review Interface).

No milestone here includes CLI dispatch, engine/data-center integration, or ACL — all
explicitly out of Stage 1 per §§7–9.

---

## 12. Carried-forward open questions (not resolved by this document)

| ID | Question | Status here |
|---|---|---|
| Q1/B-02 | `launch_contract.ts` state-aware dispatch | Out of scope — no CLI exists in this skeleton yet. `getWorkspaceState()` (§6) is the future hook. |
| Q8/B-03 | ACL mapping | Deferred, not designed — see §8 |
| CAP-08 | Multi-process CAS | Stage 1 = single-writer invariant, documented not enforced — see §7 |
| P6 | 8 pre-existing git boundary violations | Not applicable to this skeleton (the violations were reported against the old POC's `src/`); re-audit if/when old POC code is ported in |
| B-08 | Web Review Interface visual design | Unblocked by this document — API surface (§6) is ready to hand to Design |
| Q3 | `inventory_version` format | Not chosen here — needs Architecture propagation once decided; Stage 1 code should treat it as an opaque string, not assume a shape |
| Q4 | Discovery run file retention | Not designed — location kept configurable per §5, no cleanup logic written |

---

*This document supersedes nothing in `sl-02-source-discovery/`; it is Yigal's
Implementation Design layered on top of it, scoped to Stage 1 only. Architecture inputs
(SYSTEM.md invariants, ADLs, entity model) remain authoritative.*
