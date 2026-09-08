# SLICE 01 — SOURCE DISCOVERY: Full Development Plan

Based on: `SLICE_01_SOURCE_DISCOVERY_SYSTEM_V1.md`  
Codebase baseline: All packages (app, services, engine, data-center, storage, web) are placeholder skeletons.  
Goal: Implement the four production responsibilities — R-1 Local Application Shell, R-2 Source Access, R-3 Source Discovery + Candidates, R-4 Approval Authority — plus the Web review surface.

---

## Architecture Mapping: System Design → Monorepo Packages

| System Responsibility | Monorepo Package | Notes |
|---|---|---|
| R-1 Local Application Shell | `app` | Bootstrap, state-aware entry, orchestration dispatch |
| R-2 Source Access | `app/src/source-access/` | Git + folder adapters behind one contract |
| R-3 Source Discovery + Candidates | `services` | DiscoveryRun lifecycle, session providers, identity, evidence |
| R-4 Approval Authority | `services` | Confirmation, idempotency, inventory version/head |
| Persistence | `storage` + `data-center` | Durable evidence, run state, inventory |
| Review UI | `web` | Review Sources screen, actions |
| Engine / Semantic Core | `engine` | **No role in Slice 01** |

---

## Build Sequence Overview

```
Phase 0: Shared Types & Contracts
Phase 1: Persistence Layer (storage + data-center)
Phase 2: R-2 Source Access Adapters
Phase 3: R-3 Source Discovery + Candidates
Phase 4: R-1 Bootstrap & Orchestration (propperly start)
Phase 5: R-4 Approval Authority
Phase 6: Web Review UI
Phase 7: Integration, Acceptance Tests, Observability
```

Each phase produces working, testable code before the next begins.

---

## Phase 0 — Shared Types & Contracts

**Goal:** Define the core domain types and logical interfaces in one shared location so all packages consume the same vocabulary.

### 0.1 Create `packages/slice01-types` (or `app/src/domain/types.ts`)

Define TypeScript types for:

```ts
// --- Workspace ---
type WorkspaceId = string;
type WorkspaceState =
  | 'NEW'
  | 'DISCOVERY_ACTIVE'
  | 'DISCOVERY_INTERRUPTED'
  | 'REVIEW_PENDING'
  | 'INVENTORY_APPROVED'
  | 'COMMISSIONED';

interface Workspace {
  id: WorkspaceId;
  state: WorkspaceState;
  createdAt: string; // ISO
}

// --- DiscoveryRun ---
type RunId = string;
type RunStatus = 'RUNNING' | 'COMPLETED' | 'PARTIAL' | 'INTERRUPTED' | 'FAILED' | 'CANCELLED';

interface DiscoveryRun {
  id: RunId;
  workspaceId: WorkspaceId;
  status: RunStatus;
  policySnapshot: DiscoveryPolicy;
  startedAt: string;
  endedAt?: string;
}

// --- DiscoveryPolicy ---
interface DiscoveryPolicy {
  providers: string[];         // allowed provider IDs
  sessionWindowDays: number;   // bounded time window
  maxCandidates: number;
}

// --- SourceCandidate (four dimensions) ---
type Availability  = 'AVAILABLE' | 'INACCESSIBLE' | 'UNKNOWN';
type Support       = 'SUPPORTED' | 'UNSUPPORTED' | 'UNKNOWN';
type Identity      = 'RESOLVED' | 'AMBIGUOUS' | 'UNRESOLVED';
type Selection     = 'UNDECIDED' | 'INCLUDED' | 'EXCLUDED';

interface CandidateRef { runId: RunId; candidateId: string; }

interface SourceCandidateProjection {
  ref: CandidateRef;
  locator: string;
  kind: 'GIT_REPO' | 'FOLDER' | 'UNKNOWN';
  displayName: string;
  availability: Availability;
  support: Support;
  identity: Identity;
  selection: Selection;
  sessionCount: number;
  provenance: string[];        // provider IDs that contributed
}

// --- Identity Evidence ---
type IdentityRelation = 'SAME_LOCATOR' | 'AMBIGUOUS' | 'DIFFERENT';

interface IdentityEvidence {
  candidateId: string;
  relation: IdentityRelation;
  basis: string;               // human-readable reason
}

// --- Source (post-approval) ---
type SourceId = string;

interface Source {
  id: SourceId;
  workspaceId: WorkspaceId;
  locator: string;
  kind: string;
  approvedAt: string;
}

// --- SourceInventory ---
interface SourceInventory {
  workspaceId: WorkspaceId;
  version: number;
  head: string;                // opaque content hash of approved set
  sources: Source[];
  confirmedAt: string;
}

// --- Logical Interfaces (Section 8 of System Design) ---

interface BootstrapApi {
  resolveWorkspace(context: { cwd: string }): Promise<Workspace>;
  startOrResumeSourceDiscovery(workspaceId: WorkspaceId, policyRequest?: Partial<DiscoveryPolicy>, expectedState?: WorkspaceState): Promise<DiscoveryRun>;
  getDiscoveryStatus(runId: RunId): Promise<DiscoveryRun>;
  reviewSourceCandidates(workspaceId: WorkspaceId, runId: RunId): Promise<SourceCandidateProjection[]>;
  recordCandidateSelection(ref: CandidateRef, decision: 'INCLUDE' | 'EXCLUDE' | 'RESET', requestId: string): Promise<void>;
  addSourceCandidate(locator: string, declaredKind: string | undefined, requestId: string): Promise<SourceCandidateProjection>;
  confirmSourceInventory(workspaceId: WorkspaceId, includedRefs: CandidateRef[], expectedInventoryVersion: number, expectedReviewRevision: string, requestId: string): Promise<SourceInventory>;
}

interface SourceAccessApi {
  inspectSourceCandidate(input: { kind: string; locator: string }): Promise<InspectionResult>;
  identifyLocalRepository(locator: string): Promise<RepoIdentity>;
  identifyLocalFolder(locator: string): Promise<FolderIdentity>;
}

interface InspectionResult {
  locator: string;
  kind: 'GIT_REPO' | 'FOLDER' | 'UNKNOWN';
  availability: Availability;
  support: Support;
  identityEvidence: ExternalIdentity[];
}

interface ExternalIdentity {
  provider: string; // e.g. 'git-remote'
  value: string;
  confidence: 'STRONG' | 'WEAK';
}

interface RepoIdentity {
  path: string;
  remoteUrl?: string;
  remoteName?: string;
}

interface FolderIdentity {
  path: string;
  exists: boolean;
  isDirectory: boolean;
  readable: boolean;
}
```

**Deliverable:** A single `domain/types.ts` file imported by all other packages. No implementation — types only.

---

## Phase 1 — Persistence Layer

**Packages:** `storage`, `data-center`  
**Goal:** Implement the append-only, retry-safe durable store for all Slice 01 facts.

### 1.1 Storage: Low-level append-only file store

File: `storage/src/append-store.ts`

```ts
// Append a JSON record to a file (NDJSON)
appendRecord(filePath: string, record: object): Promise<void>

// Read all records from a file
readRecords<T>(filePath: string): Promise<T[]>

// Atomic write for single-document files (workspace state, inventory)
atomicWrite(filePath: string, data: object): Promise<void>

// Read single-document file
readDocument<T>(filePath: string): Promise<T | null>
```

Implementation: NDJSON for event logs; JSON for single-document files. Use `fs.rename` for atomic writes (write to temp file, rename).

### 1.2 Data Center: Domain persistence operations

File: `data-center/src/workspace-store.ts`
```ts
persistWorkspace(workspace: Workspace): Promise<void>
readWorkspace(id: WorkspaceId): Promise<Workspace | null>
updateWorkspaceState(id: WorkspaceId, state: WorkspaceState): Promise<void>
```

File: `data-center/src/discovery-store.ts`
```ts
persistDiscoveryRun(run: DiscoveryRun): Promise<void>
updateRunStatus(runId: RunId, status: RunStatus, endedAt?: string): Promise<void>
readDiscoveryRun(runId: RunId): Promise<DiscoveryRun | null>
readActiveRunForWorkspace(workspaceId: WorkspaceId): Promise<DiscoveryRun | null>
```

File: `data-center/src/candidate-store.ts`
```ts
// Append-only — never overwrites existing evidence
appendCandidateEvidence(runId: RunId, evidence: CandidateEvidenceRecord): Promise<void>
readCandidateEvidence(runId: RunId): Promise<CandidateEvidenceRecord[]>

appendSelectionDecision(runId: RunId, decision: SelectionDecisionRecord): Promise<void>
readSelectionDecisions(runId: RunId): Promise<SelectionDecisionRecord[]>
```

File: `data-center/src/inventory-store.ts`
```ts
appendConfirmationReceipt(receipt: ConfirmationReceipt): Promise<void>
readConfirmationByRequestId(requestId: string): Promise<ConfirmationReceipt | null>
persistApprovedInventory(inventory: SourceInventory): Promise<void>
readApprovedInventory(workspaceId: WorkspaceId): Promise<SourceInventory | null>
```

**Storage layout** (file-based for now; physical paths are an implementation detail, not a contract):
```
~/.propperly/
  workspaces/
    {workspaceId}/
      workspace.json              ← atomic single-doc
      discovery-runs/
        {runId}/
          run.json                ← atomic single-doc
          candidate-evidence.ndjson  ← append-only
          selection-decisions.ndjson ← append-only
      inventory/
        confirmed.json            ← atomic, versioned
        confirmation-log.ndjson   ← append-only receipts
```

**Key invariants:**
- Evidence files are append-only; never mutate prior records.
- `atomicWrite` uses temp-file + rename — crash-safe.
- `readConfirmationByRequestId` enables idempotency in Phase 5.

---

## Phase 2 — R-2 Source Access

**Package:** `app/src/source-access/`  
**Goal:** Bounded source metadata inspection behind one exported contract; source mechanics stay below the seam.

### 2.1 Git Repository Adapter

File: `app/src/source-access/repo-adapter.ts`

```ts
export async function identifyLocalRepository(locator: string): Promise<RepoIdentity & InspectionResult>
```

Implementation:
1. Check path exists (`fs.stat`)
2. Check `.git` directory present
3. Run `git remote -v` (bounded; catch errors)
4. Extract remote URL if available
5. Return `availability`, `support=SUPPORTED`, `externalIdentity` from remote
6. Never read file content, never upload corpus

Proof cases (from Spike 01):
- Valid Git repo with remote → AVAILABLE, SUPPORTED, remote identity
- Repo without remote → AVAILABLE, SUPPORTED, no external identity
- Nonexistent path → INACCESSIBLE
- Non-Git directory → kind mismatch surfaced explicitly, not hidden

### 2.2 Folder Adapter

File: `app/src/source-access/folder-adapter.ts`

```ts
export async function identifyLocalFolder(locator: string): Promise<FolderIdentity & InspectionResult>
```

Implementation:
1. Check path exists
2. Check it is a directory (not a file)
3. Check read permission (attempt `fs.readdir` with limit 1)
4. Never read file bodies
5. Do not apply Git mechanics (a folder is a folder even if it contains `.git`)

Proof cases (from Spike 02):
- Valid directory → AVAILABLE, SUPPORTED
- Missing path → INACCESSIBLE
- File not directory → INACCESSIBLE + explicit kind note
- Permission denied → INACCESSIBLE
- Git repo treated as folder → AVAILABLE, SUPPORTED (no Git mechanics)

### 2.3 Source Access Dispatch (Application → Source Access contract)

File: `app/src/source-access/index.ts`

```ts
export async function inspectSourceCandidate(input: { kind: string; locator: string }): Promise<InspectionResult>
```

Implementation (from Spike 03 — explicit typed router, no registry/DI):
```ts
switch (normalizeKind(input.kind)) {
  case 'GIT_REPO': return repoAdapter.identifyLocalRepository(input.locator);
  case 'FOLDER':   return folderAdapter.identifyLocalFolder(input.locator);
  default:         throw new KindNotSupportedError(input.kind);
}
```

Rule: unknown kinds fail explicitly. No heuristic kind inference. Source mechanics never leak above this seam.

---

## Phase 3 — R-3 Source Discovery + Candidates

**Package:** `services/src/discovery/`  
**Goal:** DiscoveryRun lifecycle, session-provider enumeration, candidate evidence accumulation, four-dimensional projection, conservative identity.

### 3.1 Discovery Policy

File: `services/src/discovery/policy.ts`

```ts
export function computeEffectivePolicy(
  adminPolicy: DiscoveryPolicy,
  userRequest?: Partial<DiscoveryPolicy>
): DiscoveryPolicy
```

Rules:
- User may only narrow, never expand beyond admin policy.
- Admin policy is the upper bound on providers and session window.
- Default admin policy: all supported local providers, 30-day window (concrete default = product tuning; defer exact value).

### 3.2 Session Providers

File: `services/src/discovery/providers/local-provider.ts`

Interface all providers implement:
```ts
interface SessionProvider {
  id: string;
  discover(policy: DiscoveryPolicy): AsyncIterable<DiscoveredReference>;
}

interface DiscoveredReference {
  locator: string;
  inferredKind: 'GIT_REPO' | 'FOLDER' | 'UNKNOWN';
  sessionCount: number;
  providerSessionIds: string[];
}
```

First supported provider (proven in Spike 04):
- Reads bounded allowlisted session metadata
- Never reads session transcript/message bodies (semantic ingestion is forbidden)
- Skips sessions outside the policy window
- Emits only `DiscoveredReference`; missing evidence yields `kind=UNKNOWN`, not invented values

### 3.3 DiscoveryRun Orchestration

File: `services/src/discovery/run-orchestrator.ts`

```ts
export async function startDiscoveryRun(workspaceId: WorkspaceId, policy: DiscoveryPolicy): Promise<DiscoveryRun>
export async function resumeDiscoveryRun(runId: RunId): Promise<DiscoveryRun>
export async function executeDiscovery(run: DiscoveryRun): Promise<void>
```

`executeDiscovery` algorithm (from Spike 06):
```
for each provider in policy.providers:
  try:
    for each reference in provider.discover(policy):
      if already seen (same locator in this run):
        appendCandidateEvidence(mergeProvenance) — idempotent, preserve provenance
        continue
      inspection = inspectSourceCandidate(reference)
      evidence = buildCandidateEvidence(reference, inspection)
      appendCandidateEvidence(run.id, evidence)   ← incremental persistence D7
  catch providerError:
    log provider error; continue remaining providers (partial run ok)

if all providers failed: markRunStatus(FAILED)
else if any provider failed: markRunStatus(PARTIAL)
else: markRunStatus(COMPLETED)
```

Resume logic (D10, Spike 06):
1. Read persisted candidates for interrupted run
2. Re-enumerate providers; skip already-persisted locators (work-unit idempotency)
3. Never silently create a duplicate DiscoveryRun

### 3.4 Conservative Identity Resolution

File: `services/src/discovery/identity.ts`

```ts
export function resolveIdentityRelation(a: CandidateEvidenceRecord, b: CandidateEvidenceRecord): IdentityRelation
```

Decision tree (from Spike 05, D8):
```
1. Exact normalized locator match → SAME_LOCATOR (group observations)
2. Contradictory strong external identity (different remote owner/name) → DIFFERENT
3. Same remote owner+name at different locators → AMBIGUOUS (do not infer MOVED)
4. Heuristic similarity (basename near-match, path looks moved) → AMBIGUOUS
5. Missing/insufficient evidence → AMBIGUOUS
```

Never: fuzzy auto-merge, automatic MOVED inference, path-as-identity.

### 3.5 Candidate Evidence & Four-Dimensional Projection

File: `services/src/discovery/candidate-projection.ts`

```ts
export function projectCandidate(
  evidence: CandidateEvidenceRecord[],
  decisions: SelectionDecisionRecord[]
): SourceCandidateProjection
```

Four independent folds (from Spike 07, D12):
- **availability** = latest availability evidence (operational fact)
- **support** = latest support evidence (technical capability fact)
- **identity** = resolved via identity evidence + human resolution (D8)
- **selection** = latest INCLUDE/EXCLUDE/RESET decision (human authority)

Key invariants:
- Projection is always rebuildable from append-only evidence — no projection-state file required (proven in Spike 07).
- Prior evidence records are never mutated.
- Selection changes override prior selection; evidence changes do not affect prior human decisions.

---

## Phase 4 — R-1 Bootstrap & Orchestration (`propperly start`)

**Package:** `app/src/bootstrap/`  
**Goal:** State-aware product entry; dispatch to correct phase based on workspace state.

### 4.1 Workspace Resolution

File: `app/src/bootstrap/workspace-resolver.ts`

```ts
export async function resolveWorkspace(context: { cwd: string }): Promise<Workspace>
```

Algorithm:
1. Load deployment config + execution identity
2. Look for existing workspace for this `cwd` / user context
3. If none: `initializeWorkspace()` → state=NEW
4. If found: return existing workspace with current state

`initializeWorkspace` sets state=NEW but does not imply commissioning (D10).

### 4.2 State-Aware Dispatch (Section 9 of System Design)

File: `app/src/bootstrap/start.ts`

```ts
export async function propperlyStart(context: { cwd: string }): Promise<void>
```

Dispatch table:
```ts
switch (workspace.state) {
  case 'NEW':
  case 'DISCOVERY_ACTIVE':
  case 'DISCOVERY_INTERRUPTED':
    await startOrResumeDiscovery(workspace);
    break;
  case 'REVIEW_PENDING':
    await openWebReview(workspace);
    break;
  case 'INVENTORY_APPROVED':
  case 'COMMISSIONED':
    await continueDownstreamFlow(workspace);  // existing behavior, not replaced
    break;
}
```

Rules:
- `propperly start` is the only product entry point (D19).
- Restart never destructively recreates workspace (D10).
- Interrupted discovery is resumed, not silently restarted.
- Active run while repeat start: return/resolve existing run; no silent duplicate (Section 11).

### 4.3 CLI Output (Section 15.1 sketch)

File: `app/src/bootstrap/cli-output.ts`

```
$ propperly start

Welcome to Propperly.

Finding the projects and sources you've been working with...

Recent sessions [done]
Referenced projects [done]
Availability [done]

8 potential sources found.
Opening Propperly...
```

---

## Phase 5 — R-4 Approval Authority

**Package:** `services/src/approval/`  
**Goal:** Explicit confirmation crossing from pre-approval to approved Source Inventory; idempotency; optimistic concurrency.

### 5.1 Review Revision Computation

File: `services/src/approval/review-revision.ts`

```ts
export function computeReviewRevision(projections: SourceCandidateProjection[]): string
```

Implementation: stable deterministic hash of the candidate projection set (sorted by candidateId). This revision binds confirmation to the state the user actually reviewed — if any candidate changes after review, the revision changes and confirmation is rejected (D14, A14).

### 5.2 Confirm Source Inventory

File: `services/src/approval/approval-authority.ts`

```ts
export async function confirmSourceInventory(
  workspaceId: WorkspaceId,
  includedRefs: CandidateRef[],
  expectedInventoryVersion: number,
  expectedReviewRevision: string,
  requestId: string
): Promise<SourceInventory>
```

Algorithm (from Spike 08):
```
1. Check confirmation log for this requestId → if found, replay committed result (idempotency, D13, A10)
2. Read current inventory head → reject if version != expectedInventoryVersion (D14)
3. Compute current review revision from live projections → reject if != expectedReviewRevision (D14, A14)
4. For each includedRef:
     resolve its candidate projection
     create Source { id: newSourceId(), locator, kind, approvedAt }
5. Assemble SourceInventory { version: current+1, head: newHash(sources), sources }
6. atomicWrite inventory  ← single serialized atomic operation (D13, D18)
7. appendConfirmationReceipt { requestId, reviewRevision, inventoryVersion, actor, timestamp }
8. updateWorkspaceState(INVENTORY_APPROVED)
9. return inventory
```

Invariants:
- Same `requestId` always returns the same committed inventory (idempotent).
- Stale inventory version → `StaleInventoryError` (caller reloads).
- Stale review revision → `StaleReviewError` (caller refreshes candidates then reconfirms).
- No Source is created from INCLUDED state alone — only from explicit `confirmSourceInventory` call (D3, D5).
- No semantic ingestion occurs as a side effect (D15).

Note: True multi-process mutual exclusion (atomic CAS for concurrent clients) is deferred to Implementation Design (Appendix C, A11). The single-writer semantic is proven (Spike 08); the physical multi-process mechanism (e.g., file lock, DB transaction) is chosen at Implementation Design time.

---

## Phase 6 — Web Review UI

**Package:** `web/src/`  
**Goal:** Review Sources screen; user actions (include/exclude/add/resolve/confirm).

### 6.1 API Routes exposed by APP to WEB

Update `app/CONTRACT.md` and `app/src/contract.ts`:

```ts
interface AppApi {
  // Discovery
  getDiscoveryStatus(runId: string): Promise<DiscoveryRun>;
  
  // Candidates
  listCandidates(workspaceId: string, runId: string): Promise<SourceCandidateProjection[]>;
  includeCandidates(refs: CandidateRef[], requestId: string): Promise<void>;
  excludeCandidate(ref: CandidateRef, requestId: string): Promise<void>;
  addManualCandidate(locator: string, declaredKind?: string, requestId: string): Promise<SourceCandidateProjection>;
  
  // Identity ambiguity
  resolveIdentityAmbiguity(ref: CandidateRef, resolution: 'SAME' | 'DIFFERENT', requestId: string): Promise<void>;
  
  // Confirmation
  confirmInventory(workspaceId: string, includedRefs: CandidateRef[], expectedInventoryVersion: number, expectedReviewRevision: string, requestId: string): Promise<SourceInventory>;
}
```

### 6.2 Review Sources Screen (Section 15.2 sketch)

```
+------------------------------------------------------+
| We found 8 sources you've been working with          |
+------------------------------------------------------+
| [x] propperly           Git repo   18 recent sessions|
| [x] analytics-dbt       Git repo    7 recent sessions|
| [ ] old-propperly       Git repo   previously excluded|
| [!] finance-models      Folder     access unavailable |
+------------------------------------------------------+
| + Add source                    Continue with 6 →   |
+------------------------------------------------------+
```

Components:
- `CandidateList` — renders all candidate projections; maps four dimensions to UI state
- `CandidateRow` — checkbox (selection), status icon (availability), info (sessions, kind)
- `IdentityAmbiguityModal` — "Is this the same project?" dialog (Section 15.3)
- `AddSourceForm` — locator input + kind selector
- `ConfirmButton` — disabled until at least 1 included; label shows count

State:
- Poll or SSE for DiscoveryRun status (RUNNING → COMPLETED/PARTIAL)
- Optimistic UI for include/exclude
- Conflict errors (stale inventory or review revision) → show refresh prompt

### 6.3 Resume Screen (Section 15.4 sketch)

Shown when workspace state = DISCOVERY_INTERRUPTED:
```
Previous source discovery was interrupted.
17 sources were already found.

[Continue discovery]  [Review 17 sources]  [Start over]
```

"Start over" is an explicit user choice only — never implicit (D10).

---

## Phase 7 — Integration, Tests & Observability

### 7.1 Acceptance Scenario Tests

Implement as integration tests covering all 14 scenarios from Section 17:

| ID | Test case |
|---|---|
| A1 | Fresh workspace → 8 valid candidates → confirm → exactly selected Sources created |
| A2 | No sessions found → zero candidates → manual add still works |
| A3 | One provider unavailable → other providers continue → run=PARTIAL |
| A4 | Same repo in 20 sessions → one candidate projection with all provenance |
| A5 | Same remote at different locator → AMBIGUOUS, not auto-merged |
| A6 | Folder moved → AMBIGUOUS → human resolves |
| A7 | User excludes candidate → no Source created |
| A8 | Manual add duplicates discovered candidate → identity path prevents duplicate |
| A9 | Discovery interrupted → persisted candidates survive → resume works |
| A10 | Confirm retried with same requestId → same inventory, no duplicate transition |
| A11 | Two concurrent confirms → one commits, other gets StaleInventoryError |
| A12 | Air-gapped on-prem → full slice completes without external network call |
| A13 | Hosted deployment → no source corpus leaves local environment |
| A14 | Candidate evidence changes after review → confirmation with old revision rejected |

### 7.2 Contract / Unit Tests

Per capability:
- `inspectSourceCandidate` — all Spike 01/02/03 proof cases
- `identityRelation` — all Spike 05 proof cases
- `projectCandidate` — all Spike 07 proof cases (deterministic replay, dimension independence)
- `confirmSourceInventory` — all Spike 08 proof cases (idempotency, stale version, stale revision, crash recovery)
- `computeEffectivePolicy` — user cannot expand beyond admin policy

### 7.3 Structured Observability Events (Section 14)

Every structured event includes:

| Field | Type | Notes |
|---|---|---|
| `run_id` | string | Stable correlation identity |
| `workspace_id` | string | Always workspace-scoped |
| `provider` | string | Which session provider |
| `event_type` | string | e.g. `discovery.run.started`, `candidate.persisted`, `inventory.confirmed` |
| `timestamp` | ISO string | |
| `error_code` | string? | Machine-readable error taxonomy |

No vendor-specific telemetry. Events must be wirable to local or enterprise observability.

Minimum event set:
- `discovery.run.started` / `completed` / `partial` / `interrupted` / `failed`
- `provider.started` / `completed` / `failed` (with candidate count)
- `candidate.persisted` (with availability, support, identity dimensions)
- `candidate.deduped` (provenance merged)
- `identity.ambiguous` (raised for human review)
- `selection.recorded` (include/exclude/reset)
- `inventory.confirm.requested` / `committed` / `replayed` / `rejected` (stale)
- `resume.reason` (why run was resumed vs restarted)

---

## Permissions Model

Implement enforcement in Orchestrator (R-1) before capability dispatch:

| Permission | Checked before |
|---|---|
| `DISCOVER_SOURCES` | `startOrResumeSourceDiscovery` |
| `VIEW_DISCOVERED_SOURCES` | `reviewSourceCandidates`, `listCandidates` |
| `MANAGE_SOURCE_INVENTORY` | `recordCandidateSelection`, `addSourceCandidate`, `confirmSourceInventory` |

Security constraints:
- Secrets must not appear in candidate metadata, evidence logs, or confirmation receipts.
- Discovery logs must not include raw source content.
- Workspace/source metadata is isolated per workspace.
- Hosted mode: no source corpus leaves the customer environment during Slice 01.

---

## Deferred — Not Part of This Build

These are explicitly deferred per Section 19 and Appendix C. Do not implement:

- Additional session providers beyond the first proven local provider
- REST vs gRPC vs IPC physical transport choice
- Database/storage technology migration (NDJSON files are the spike-valid starting point)
- True multi-process atomic CAS mechanism (file locks are acceptable for single-user initial build)
- Cloud vendor / infrastructure services
- Remote / API source adapters (Google Docs, GitHub API, etc.)
- Identity edge cases: symlink equivalence, case normalization, fork/mirror semantics
- Final visual UX design
- Enterprise ACL integration and production auth/actor model
- Container topology and installer mechanics

---

## Build Order Summary (Sequenced by Dependency)

```
Step 1  → Phase 0: domain/types.ts                    (no deps)
Step 2  → Phase 1: storage append-store               (no deps)
Step 3  → Phase 1: data-center domain stores          (depends: storage)
Step 4  → Phase 2: Source Access adapters             (depends: types)
Step 5  → Phase 2: Source Access dispatch             (depends: adapters)
Step 6  → Phase 3: Discovery Policy                   (depends: types)
Step 7  → Phase 3: Session Provider(s)                (depends: policy)
Step 8  → Phase 3: DiscoveryRun Orchestration         (depends: providers, data-center, source-access)
Step 9  → Phase 3: Identity Resolution                (depends: types)
Step 10 → Phase 3: Candidate Projection               (depends: evidence store, identity)
Step 11 → Phase 4: Workspace Resolution               (depends: data-center)
Step 12 → Phase 4: propperly start dispatch           (depends: workspace-resolver, run-orchestrator)
Step 13 → Phase 5: Review Revision computation        (depends: candidate-projection)
Step 14 → Phase 5: confirmSourceInventory             (depends: review-revision, inventory-store)
Step 15 → Phase 6: APP API routes                     (depends: all of above)
Step 16 → Phase 6: Web Review UI                      (depends: APP API)
Step 17 → Phase 7: Acceptance + contract tests        (depends: all)
Step 18 → Phase 7: Observability events               (integrated throughout 1-16)
```

---

## Definition of Done for Slice 01

- [ ] `propperly start` dispatches correctly to all five workspace states (Section 9)
- [ ] DiscoveryRun lifecycle: NEW → RUNNING → COMPLETED / PARTIAL / INTERRUPTED / FAILED
- [ ] All 14 acceptance scenarios (A1–A14) pass as automated tests
- [ ] Candidate projection is always rebuildable from evidence (no projection-state file)
- [ ] Confirmation is idempotent by requestId (A10)
- [ ] Stale inventory version and stale review revision are both rejected (A14)
- [ ] No source corpus is ingested or transmitted during discovery
- [ ] On-prem deployment (A12) works without external network
- [ ] Hosted deployment (A13) transmits only bounded metadata
- [ ] Structured observability events emitted for all key transitions
- [ ] All R-1/R-2/R-3/R-4 authority boundaries hold (source mechanics never above seam, approval only at R-4)
- [ ] Engine/Semantic Core has zero involvement in Slice 01
```
