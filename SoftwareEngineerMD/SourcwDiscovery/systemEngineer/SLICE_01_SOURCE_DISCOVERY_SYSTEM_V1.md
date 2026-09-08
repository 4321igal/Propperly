**PROPPERLY**

SLICE 01 — SOURCE DISCOVERY
SYSTEM DESIGN V3

First-Run Source Discovery & Approval — architecture review after capability planning, empirical spikes, code-reality audit, and reconciliation

| Status SYSTEM DESIGN VALIDATED AGAINST CODE REALITY — READY FOR YIGAL ARCHITECTURE REVIEW. The target system remains authoritative; capability proofs and code-reality findings have been reconciled into this version. Implementation Design intentionally follows architecture review. |
| --- |

| **Field** | **Value** |
| --- | --- |
| Slice boundary | Trusted local bootstrap → Approved Source Inventory |
| Primary entry | CLI / trusted local bootstrap; rich review in Web |
| Primary authority | Services / Orchestrator |
| Local discovery | Logical component behind a bounded contract |
| Semantic Engine | Not used in Slice 01 |
| Canonical knowledge | Not created or mutated in Slice 01 |
| Next phase | Yigal Architecture Review → Implementation Design → Build |

# 1. Purpose and Slice Boundary

Slice 01 establishes the first approved set of sources for a new Propperly workspace. It does not ingest source content for semantic reconstruction and does not create knowledge.

| **System outcome** At the end of the slice, the workspace has an Approved Source Inventory containing only user-authorized Sources. Discovery observations, candidate dispositions, and the decision history remain available for resume, deduplication, and later source-set changes. |
| --- |

## 1.1 In scope

* Trusted local bootstrap and workspace resolution.
* Session-informed discovery from supported local session providers.
* Lightweight validation of referenced locations.
* Incremental persistence of discovery candidates.
* Identity evidence and conservative deduplication.
* Web review of discovered candidates.
* Include / exclude / manual add / identity ambiguity resolution.
* Inventory confirmation with idempotency and optimistic concurrency.
* Resume, partial completion, interruption, and bounded failure handling.
* Hosted and fully on-prem deployment compatibility.

## 1.2 Explicitly out of scope

* Source-internal scope and exclusions.
* Semantic ingestion, reconstruction, candidate knowledge generation, or Engine execution.
* Knowledge grounding, Needs Attention, or canonical knowledge transitions.
* Concrete transport protocol, database engine, table names, cloud services, or process topology.
* Exact UX visual styling.

# 2. Accepted Design Decisions

| **ID** | **Decision** | **Rule** |
| --- | --- | --- |
| D1 | Local-first bootstrap | First run begins in a trusted local execution environment. |
| D2 | Discovery-first UX | Propperly proposes sources before asking the user to manually configure them. |
| D3 | Human authority | Only explicit user confirmation creates the Approved Source Inventory. |
| D4 | Inspection level B | Discovery may identify and lightly validate sources; no semantic content ingestion before authorization. |
| D5 | Pre-approval model | DiscoveryRun → SourceCandidate; Source exists only after approval. |
| D6 | Rejected retention | Rejected candidates remain in discovery/decision history but are not active Sources. |
| D7 | Incremental persistence | Candidates are persisted as they are discovered and normalized. |
| D8 | Conservative identity | Strong identity may auto-dedup; heuristics may only raise ambiguity. |
| D9 | Discovery policy | Supported local providers are auto-detected; policy is bounded/configurable; admin policy is the upper bound. |
| D10 | State-aware start | propperly start resolves current workspace/discovery state rather than blindly restarting. |
| D11 | Orchestrator authority | Use-case sequencing, authorization, policy, disposition transitions, and confirmation belong to Orchestrator. |
| D12 | Dimensional candidate state | Availability, support, identity, and selection are separate dimensions. |
| D13 | Idempotent confirmation | Confirmation is retry-safe: the same logical request cannot create duplicate authority transitions or duplicate inventory versions. |
| D14 | Optimistic concurrency | Confirmation binds to both expected inventory version/head and the reviewed candidate-state revision; stale authority or stale review is rejected. |
| D15 | Metadata boundary | Discovery moves source metadata/identity evidence, not the source corpus. |
| D16 | Execution follows the data | Source-specific access executes where the source is available; logical contracts remain portable across hosted and on-prem deployments. |
| D17 | Capability-first implementation | Repo, folder, session discovery, identity, orchestration, candidate state, and approval are separable capabilities; physical services/processes are not implied. |
| D18 | Approval snapshot | Approved Source Inventory is an explicit authority snapshot; later discovery evidence does not silently mutate prior approval. |
| D19 | State-aware product entry | `propperly start` remains the canonical product entry and dispatches according to workspace/source-authority state rather than exposing internal capability verbs. |

# 3. System Context and Component Responsibilities

USER
 |
 +-------+-------+
 | |
 CLI / LOCAL WEB REVIEW
 BOOTSTRAP UI
 | |
 +-------+-------+
 |
 v
 R-1 LOCAL APPLICATION SHELL
 ingress + presentation
 |
 v
 R-3 SOURCE DISCOVERY + CANDIDATES
 run / policy / evidence / projection
 | |
 | inspect | confirm
 v v
 R-2 SOURCE ACCESS R-4 APPROVAL AUTHORITY
 adapter boundary authority transition
 / | \ |
 v v v v
 Local Repo Folder Session APPROVED SOURCE
 Adapter Adapter Providers INVENTORY
 \ | /
 customer/local data

ENGINE / SEMANTIC CORE: NO ROLE IN SLICE 01
MCP: NO ROLE IN FIRST-RUN PATH

Logical responsibilities do not imply separate processes or microservices.

| **Component** | **Owns** | **Must not own** |
| --- | --- | --- |
| R-1 Local Application Shell | Trusted bootstrap, state-aware product ingress, browser/local runtime, review presentation, capture of user actions. | Git/filesystem/session mechanics; source identity mechanics; approval authority; semantic processing. |
| R-2 Source Access | Bounded source identification and metadata/access inspection through source-specific adapters; local repo and folder now, later remote/API adapters behind the same logical boundary. | User authorization, candidate disposition, discovery lifecycle, canonical knowledge. |
| R-3 Source Discovery + Candidates | Recent-work/session discovery, DiscoveryRun lifecycle, effective policy, incremental candidate evidence, conservative identity workflow, deterministic candidate projection, retry/resume. | Source-specific mechanics, approval authority, semantic reconstruction. |
| R-4 Approval Authority | Explicit confirmation, idempotency, reviewed-state binding, inventory version/head, durable confirmation receipt and Approved Source Inventory. | Discovery mechanics, semantic ingestion, automatic approval. |
| Engine / Semantic Core | None in Slice 01. | Any Slice 01 responsibility. |

| **Architecture proof** CLI and Web are ingress surfaces. Both converge on the same application authority. Local Discovery is a capability boundary, not an authority boundary. This preserves the target architecture without requiring microservice topology. |
| --- |

# 4. End-to-End Solution Flow

1. User runs `propperly start` in a trusted local environment.
2. Bootstrap validates runtime prerequisites, loads effective policy/configuration, resolves the user/execution identity, and resolves the current workspace.
3. If the workspace is new, it is initialized without implying commissioning.
4. Orchestrator evaluates current state: new workspace, active discovery, interrupted discovery, completed discovery awaiting confirmation, or already-commissioned workspace.
5. For a new discovery, Orchestrator creates a DiscoveryRun and computes the effective DiscoveryPolicy.
6. Local Discovery enumerates supported session providers permitted by policy and inspects the bounded session window.
7. Each discovered source reference is inspected through Source Access using bounded metadata/access/identity evidence only; source corpus is not semantically ingested.
8. Source Discovery + Candidates groups strong same-locator observations, preserves ambiguity where identity evidence is insufficient, and persists candidate evidence incrementally.
9. DiscoveryRun ends as COMPLETED, PARTIAL, INTERRUPTED, FAILED, or CANCELLED.
10. Web opens the Review Sources experience using persisted candidate state.
11. User includes, excludes, manually adds, or resolves ambiguous candidates.
12. Manual additions pass through the same validation and identity pipeline.
13. User confirms `Continue with N sources`.
14. Approval Authority authorizes confirmation, checks the expected inventory version/head and the reviewed candidate-state revision, commits the selected authority snapshot idempotently, and advances the inventory version.
15. Approved Source Inventory becomes the output for the next product phase. No semantic ingestion or canonical knowledge creation has occurred.

# 5. Sequence Diagrams

## 5.1 Happy path

User CLI Orchestrator LocalDiscovery DataCenter Web
 | | | | | |
 | start | | | | |
 |---------->| resolve/init | | | |
 | |------------->| create run | | |
 | | |-------------------------------> | |
 | | | discover(policy) | | |
 | | |----------------->| | |
 | | | | candidate A | |
 | | |<-----------------| | |
 | | | persist cand A | |
 | | |------------------------------------>| |
 | | | | candidate B | |
 | | |<-----------------| | |
 | | | persist cand B | |
 | | |------------------------------------>| |
 | | | complete run | |
 | | |------------------------------------>| |
 | | open web | | |
 |<----------| | | |
 |---------------------------------------------------------------------------> |
 | review candidates |
 |<--------------------------------------------------------------------------- |
 | include/exclude/add/resolve |
 |---------------------------------------------------------------------------> |
 | confirm(expected\_version) |
 | | |
 | | authorize + commit inventory |
 | |---------------------------> |
 | |<--------------------------- |
 |<---------------------------------------------------------------- approved ----|

## 5.2 Interrupted discovery and resume

DiscoveryRun RUNNING
 |
 +-- candidate 1 persisted
 +-- candidate 2 persisted
 +-- candidate 3 persisted
 |
 process/session execution stops
 v
DiscoveryRun = INTERRUPTED
 |
next `propperly start`
 v
state-aware bootstrap
 |
 +--> Continue discovery
 +--> Review 3 persisted candidates
 +--> Start over (explicit user choice only)

## 5.3 Identity ambiguity

New observation
 |
identity evidence
 |
strong match? ---- yes ---> collapse duplicate observation / reconnect existing Source
 |
 no
 v
heuristic similarity?
 |
 yes
 v
IDENTITY = AMBIGUOUS
 |
Web asks: Same source / Different source
 |
 +--> Same: attach locator/evidence to existing identity
 +--> Different: preserve as separate candidate/source

## 5.4 Manual add

User -> Web: Add source
 -> Orchestrator: candidate input
 -> Local Discovery / relevant connector: validate
 -> Orchestrator: normalize + identity resolution
 -> Data Center: persist SourceCandidate(discovery\_origin=MANUAL)
 -> Web: candidate appears in same review list
 -> User confirms inventory

# 6. Logical Data and Entity Model

Workspace
 |
 +-- DiscoveryRun [0..\*]
 | |
 | +-- SourceCandidate [0..\*]
 | |
 | +-- IdentityEvidence [0..\*]
 | +-- CandidateDisposition [0..1 per review version]
 |
 +-- SourceInventory [1 logical current head + version history]
 |
 +-- Source [0..\*]
 |
 +-- SourceLocator [1 current, history optional]
 +-- ExternalIdentity [0..\*]

| **Entity** | **Purpose** | **Persistence requirement** |
| --- | --- | --- |
| Workspace | Stable product environment independent of commissioning | Durable |
| DiscoveryRun | Operational record of one discovery execution | Durable for resume/audit |
| SourceCandidate | Observed/proposed source before approval | Durable incrementally |
| IdentityEvidence | Evidence used to resolve candidate/source identity | Durable where needed to explain dedup decisions |
| CandidateDisposition | User include/exclude/identity resolution decision | Durable decision history |
| Source | Approved source with stable Propperly source\_id | Durable |
| SourceInventory | Versioned approved set of Sources for a workspace | Durable, concurrency-protected |

## 6.1 SourceCandidate dimensions

| **Dimension** | **Values** | **Notes** |
| --- | --- | --- |
| availability | AVAILABLE / INACCESSIBLE / UNKNOWN | Operational accessibility only |
| support | SUPPORTED / UNSUPPORTED / UNKNOWN | Whether Propperly can process the source type |
| identity | RESOLVED / AMBIGUOUS / UNRESOLVED | Identity certainty |
| selection | UNDECIDED / INCLUDED / EXCLUDED | Human disposition |

| **Why dimensional state** A source can be supported but inaccessible, or accessible but identity-ambiguous. A single enum would collapse independent facts and make later flows harder to reason about. |
| --- |

## 6.2 Source identity contract

* `source\_id` is a stable Propperly identifier created only at the approval/canonical Source boundary; discovery candidates and grouping handles are not Source identifiers.
* `locator` is the current way to reach a source and a useful observation/grouping signal; it is not authoritative stable Source identity.
* External identity evidence is preferred when reliable, but same remote owner/name at different locators is not by itself sufficient to infer a move or silently merge local access instances.
* Exact normalized locator equality may group repeated observations as SAME\_LOCATOR; that grouping is deliberately weaker than a canonical same-Source claim.
* Contradictory strong identity evidence may establish DIFFERENT. Weak similarity or moved-looking paths may only surface AMBIGUOUS; no fuzzy auto-merge or automatic MOVED inference.

## 6.3 Source, File & Artifact Contract

This contract makes explicit what Slice 01 reads/connects to and what Propperly creates. It is intentionally split into logical artifacts versus physical filenames: exact production paths, database tables, and serialization formats are deferred unless already proven.

|  |  |  |  |  |  |  |
| --- | --- | --- | --- | --- | --- | --- |
| **Input / connection** | **Ownership** | **What Slice 01 reads** | **What it may do** | **Execution** | **Status** | **Pending / boundary** |
| Local Git repository | Customer source | Local filesystem path + Git metadata/remote identity where available | Level-B metadata/identity inspection only; no repository corpus upload or semantic ingestion | Local / On-prem for local repo | PROVEN | Branch/provider-host enrichment and remote/API repo adapter are pending. |
| Local folder | Customer source | Directory existence/type/access metadata | Level-B validation only; no file-body reading in Slice 01 discovery | Local / On-prem | PROVEN | Which file types inside an approved folder are later ingestible is outside Slice 01. |
| Local session provider | Discovery input | Bounded provider/session metadata and allowlisted source-reference signals | Find recent source references; transcript/message-body semantic ingestion is forbidden | Local / On-prem for local providers | PROVEN for tested provider pattern | Additional providers, exact production provider paths/formats, and retention policy are pending. |
| Manual source locator | User input | Locator + declared kind where known | Pass through same Source Access inspection and identity pipeline | Where locator is reachable | TARGET / supported by proven seams | Remote/API kinds are future adapters. |
| Future APIs / Docs / remote stores | Customer source | Provider API metadata via future adapter | Not implemented in Slice 01 current proof set | Cloud or On-prem depending on provider/auth | PENDING | Google Docs and other APIs are examples only, not current supported claims. |

### Propperly-owned artifacts created by Slice 01

|  |  |  |  |  |
| --- | --- | --- | --- | --- |
| **Artifact** | **Logical form** | **Contains** | **Why it exists** | **Physical representation** |
| Workspace state | Logical durable state | Workspace identity and current lifecycle/source-authority state | State-aware product entry | Physical file/table name TBD |
| DiscoveryRun | Logical durable record | run\_id, status, policy snapshot, progress/checkpoint/error facts | Resume/audit/diagnostics | Spike proof used run metadata/checkpoint/log files; production representation TBD |
| Candidate evidence | Append-only logical evidence | availability/support/identity/discovery observations + provenance | Rebuild candidate projection | Spike used NDJSON evidence; physical production format TBD |
| Selection decisions | Append-only human decision log | include/exclude/reset decisions + request identity | Human disposition history | Spike used NDJSON decisions; physical production format TBD |
| Candidate projection | Derived view, not authoritative file | availability + support + identity + selection | Review UI | Must be rebuildable; spike explicitly proved no projection file is required |
| Confirmation receipt/log | Durable authority evidence | request id, reviewed revision, inventory version/head, selected member snapshot | Idempotent authority transition / recovery | Spike used append-only confirmation log; production atomic storage TBD |
| Approved Source Inventory | Logical authoritative output | versioned approved member snapshot / Source records | Handoff to downstream product phase | Exact physical schema/file TBD; later evidence must not silently mutate it |

**Important boundary:** the current evidence supports exact physical spike files only as proof artifacts, not as the production persistence contract. The production contract is the durable information and invariants above. Exact filenames/storage are Implementation Design unless separately proven.

# 7. Persistence Design Requirements

The System Design fixes what must persist, not the physical database technology or table names.

| **Persisted fact** | **When written** | **Why** |
| --- | --- | --- |
| Workspace identity/state | Workspace initialization | State-aware startup |
| DiscoveryRun status/policy | At create and every terminal transition | Resume, diagnostics, audit |
| SourceCandidate | Immediately after normalization | Crash safety, partial review, dedup |
| IdentityEvidence | With candidate or identity resolution | Explainability and future re-discovery |
| User disposition | At each include/exclude/identity action or committed review snapshot | Decision history |
| Approved Source | On confirmed inventory transition | Stable downstream source identity |
| SourceInventory head/version | On confirm | Optimistic concurrency and downstream handoff |

* Discovery work-unit processing and candidate evidence writes must be retry-safe and incrementally durable; repeated observations preserve provenance rather than overwrite history.
* `confirmSourceInventory` must be idempotent by stable request identity, including retry after restart or a lost response.
* Inventory confirmation must reject both stale inventory version/head and stale reviewed candidate-state revision.
* No source corpus or derived semantic knowledge is persisted as a side effect of discovery.

# 8. Logical Interfaces and Contracts

Bootstrap / Application use cases
--------------------------------
resolveWorkspace(context)
startOrResumeSourceDiscovery(workspace\_id, policy\_request, expected\_state?)
getDiscoveryStatus(run\_id)
reviewSourceCandidates(workspace\_id, run\_id)
recordCandidateSelection(candidate\_ref, decision, request\_id)
addSourceCandidate(locator, declared\_kind?, request\_id)
confirmSourceInventory(workspace\_id, included\_refs, expected\_inventory\_version, expected\_review\_revision, request\_id)

Source Access capability
------------------------
inspectSourceCandidate({kind, locator})
 -> bounded metadata/access/identity result
identifyLocalRepository(locator)
identifyLocalFolder(locator)

Source Discovery + Candidates
-----------------------------
discoverRecentSessions(policy)
startDiscoveryRun(...)
resumeDiscoveryRun(run\_id)
appendCandidateEvidence(...)
projectCandidate(candidate\_ref)
resolveIdentityRelation(a, b)

Approval Authority
------------------
computeReviewRevision(candidate\_projection\_set)
confirmSourceInventory(...)
getApprovedSourceInventory(workspace\_id)

Persistence
-----------
appendDiscoveryEvidence(...)
appendSelectionDecision(...)
persistDiscoveryRun(...)
appendConfirmationReceipt(...)
readApprovedSourceInventory(...)

## 8.1 Contract principles

* Transport-agnostic at this stage: in-process, IPC, HTTP, or RPC may implement the same contracts later.
* Commands that can create durable state carry stable operation/request identity where retry is possible.
* Read operations are retry-safe.
* Write operations expose stale-version errors rather than silently overwriting current state.
* Local Discovery never receives authority to commit Sources.

# 9. Workspace Initialization and State-Aware Entry

propperly start
 |
 v
Resolve deployment config + identity
 |
 v
Resolve Workspace + Approved Source Inventory state
 |
 +-- no workspace ----------------> Initialize Workspace -> Source Discovery
 |
 +-- active/interrupted discovery -> Resume / Review
 |
 +-- review awaiting confirmation -> Review Sources
 |
 +-- approved inventory exists ---> Continue downstream product flow
 |
 +-- commissioned state ----------> Existing commissioned flow

`propperly start` is the product front door. State-aware dispatch is added above existing behavior; implementation must not destructively replace current downstream/reconstruction paths.

* Workspace existence does not imply commissioning.
* An ACTIVE workspace may legitimately have an empty Source Inventory and no knowledge world.
* Restart reuses/resolves existing state; destructive recreation is never implicit.
* Interrupted discovery is recoverable.

# 10. Discovery Policy and Trust Boundary

| **Policy element** | **Rule** |
| --- | --- |
| Provider selection | Auto-detect supported local session providers within effective policy |
| Time window | Bounded and configurable; concrete default deferred to product tuning |
| Admin authority | Enterprise/admin policy defines the maximum permitted boundary |
| User authority | User may narrow discovery, never expand beyond admin policy |
| Source validation | Lightweight metadata/identity/access checks allowed |
| Content ingestion | Forbidden before source approval |
| Manual add | Always available but follows same validation/identity pipeline |

| **Trust invariant** Session history may be inspected as discovery evidence only within policy. A discovered source is not authorization to ingest its content. This distinction must remain testable in hosted and on-prem deployments. |
| --- |

# 11. Failure, Retry, Resume, and Concurrency

| **Scenario** | **Required behavior** |
| --- | --- |
| One provider unavailable | Continue other providers; run may finish PARTIAL |
| One session corrupt | Bounded error; continue where safe |
| Source path inaccessible | Candidate retained with availability=INACCESSIBLE |
| Unsupported source | Candidate retained with support=UNSUPPORTED |
| All providers fail | Run FAILED |
| Execution stops mid-run | Run INTERRUPTED; persisted candidates remain |
| Repeat start while run active | Return/resolve active run or require explicit new run; no silent duplicate run |
| Same source seen repeatedly | Dedup observations where identity is strong |
| Double confirm | Same request id replays the committed result; no duplicate authority transition. |
| Two clients confirm concurrently | Logical contract requires expected-version + reviewed-state conflict detection inside one serialized/atomic authority boundary. Multi-process physical CAS mechanism is deferred to Implementation Design. |
| Manual add duplicates discovered source | Same identity resolution path |
| Candidate state changes after review | Confirmation rejects stale review revision and requires refresh; correct inventory version alone is insufficient. |

# 12. Permissions, Security, and Privacy

| **Permission** | **Meaning** |
| --- | --- |
| DISCOVER\_SOURCES | May initiate discovery under effective policy |
| VIEW\_DISCOVERED\_SOURCES | May inspect candidates and bounded metadata |
| MANAGE\_SOURCE\_INVENTORY | May include/exclude/add/resolve/confirm |

* Orchestrator is the permission enforcement point before capability execution or durable mutation.
* Local Discovery runs least-privilege within the permitted local boundary.
* Secrets must not be persisted in candidate metadata, receipts, or logs.
* Discovery logs must not include raw source content.
* Workspace/source metadata must remain isolated across tenants/workspaces.
* Hosted mode must not require source corpus to leave the customer environment during discovery.

# 13. Deployment and On-Prem Behavior

HOSTED
Customer environment Propperly-hosted
+---------------------+ metadata +----------------------+
| Local Discovery | -------------->| Orchestrator |
| sessions/filesystem | | Data Center |
+---------------------+ | Web |
 +----------------------+

ON-PREM / AIR-GAPPED
Customer environment
+-------------------------------------------------------------+
| Local Discovery | Orchestrator | Data Center | Web |
+-------------------------------------------------------------+

Same logical contracts and authority boundaries in both profiles.

* Process count is not frozen by this design.
* Source Access may be in-process in an initial local runtime and extracted later without changing its logical contract or authority boundary.
* Concrete HTTP/gRPC/IPC choice and local-server vs hosted-agent topology are deferred; execution follows the data.
* Zero-external-egress operation remains possible by design, including fully on-prem / air-gapped deployment.

## 13.1 Capability Execution Placement

Placement is constrained by data reachability and authority, not by an assumption that every capability is a service. The matrix distinguishes where a capability can execute from the final production topology, which remains an Implementation Design decision.

|  |  |  |  |  |
| --- | --- | --- | --- | --- |
| **Capability** | **Client/local** | **Hosted cloud** | **On-prem** | **Placement constraint** |
| Local repository access | YES | Not directly for a workstation-only repo; YES for remotely reachable repo via a future remote adapter | YES | Git mechanics execute where the repository is reachable. |
| Local folder access | YES | NO direct access to workstation filesystem | YES | Filesystem-local capability; cloud cannot inspect an unshared local folder. |
| Recent local session discovery | YES | NO direct access to local provider state | YES | Must execute where supported session metadata exists. |
| Source identity relation | YES | YES | YES | Pure logic after bounded metadata/identity evidence is available. |
| Candidate evidence + projection | YES | YES | YES | Operates on Propperly-owned metadata/evidence; placement follows deployment profile. |
| DiscoveryRun orchestration | YES | YES | YES | Logical application capability; must reach Source Access and durable run state. |
| Approval authority | YES | YES | YES | Requires one serialized/atomic durable authority boundary for the deployment. |
| Web review presentation | YES via local shell | YES | YES | Presentation may be local or hosted; it never gains source mechanics or approval authority. |

# 14. Observability and Operational Requirements

| **Signal** | **Minimum requirement** |
| --- | --- |
| run\_id | Stable correlation identity for the discovery execution |
| workspace\_id | Every discovery event is workspace-scoped |
| provider | Identify which session provider produced/failed an observation |
| candidate counts | Discovered / deduped / included / excluded / inaccessible / unsupported / ambiguous |
| duration | Run and provider duration |
| error code | Bounded machine-readable error taxonomy |
| resume reason | Why/how a run resumed or was restarted |
| confirmation actor | Who confirmed inventory and at which version/head |

Vendor-specific telemetry is not part of this design. The system must emit structured, supportable facts that can be wired to local or enterprise observability later.

# 15. Low-Fidelity System Interaction Sketches

## 15.1 CLI bootstrap

$ propperly start

Welcome to Propperly.

Finding the projects and sources you've been working with...

Recent sessions [done]
Referenced projects [done]
Availability [done]

8 potential sources found.
Opening Propperly...

## 15.2 Web review

+------------------------------------------------------+
| We found 8 sources you've been working with |
+------------------------------------------------------+
| [x] propperly Git repo 18 recent sessions |
| [x] analytics dbt project 7 recent sessions |
| [ ] old-propperly Git repo previously excluded|
| [!] finance-models Folder access unavailable |
+------------------------------------------------------+
| + Add source Continue with 6 -> |
+------------------------------------------------------+

## 15.3 Identity ambiguity

+------------------------------------------------------+
| Is this the same project? |
| |
| Previously connected: ~/old/location/propperly |
| Found now: ~/work/propperly |
| |
| [Yes, same source] [No, different source] |
+------------------------------------------------------+

## 15.4 Resume

Previous source discovery was interrupted.
17 sources were already found.

[Continue discovery] [Review 17 sources] [Start over]

# 16. Expected Implementation Impact

This section names logical implementation obligations without binding current repository files or technologies.

| **Area** | **Expected addition/change** |
| --- | --- |
| Local Application Shell | Extend existing shell/runtime with state-aware Slice 01 routing and review surface; no new top-level server/security layer is implied. |
| Source Access | Promote/reuse bounded repo/folder inspection behind one application-facing contract; source-specific mechanics stay below the seam. |
| Source Discovery + Candidates | Promote proven run lifecycle, recent-session discovery, append-only evidence, four-dimensional projection, conservative identity, resume/idempotency. |
| Approval Authority | Promote explicit confirmation boundary with request idempotency, inventory version/head, reviewed-state revision, and durable receipt/inventory fold. |
| Persistence | Choose production storage/serialization mechanism that preserves append/replay semantics and atomic/serialized confirmation invariant. |
| Testing | Carry spike proof cases forward as acceptance/contract tests; add production security/auth and true concurrency tests. |
| Observability | Structured run/candidate/confirmation events using existing enterprise/local observability integration points. |

| **Not decided here** No table names, TypeScript filenames, AWS services, SQL engine, queue, protocol, or container topology are prescribed. Those decisions come after Code Reality Audit and reconciliation. |
| --- |

# 17. Acceptance Scenarios

| **ID** | **Scenario** | **Expected result** |
| --- | --- | --- |
| A1 | Fresh workspace, eight valid candidates | Run completes; candidates persist; Web can review; confirm creates exactly selected Sources. |
| A2 | No sessions found | Run completes with zero candidates; manual add remains available. |
| A3 | One provider unavailable | Other providers continue; run PARTIAL, not global failure. |
| A4 | Same repo referenced by 20 sessions | Repeated same-locator observations group into one candidate projection with preserved provenance; no canonical same-Source claim is inferred beyond evidence. |
| A5 | Same remote identity observed at a different locator | Do not infer MOVED automatically; preserve AMBIGUOUS unless stronger identity evidence or human resolution exists. |
| A6 | Folder moved; identity ambiguous | No auto-merge; human resolves. |
| A7 | User excludes candidate | Disposition persists; no Source created. |
| A8 | Manual add duplicates discovered candidate | Same identity path prevents duplicate Source. |
| A9 | Discovery interrupted | Persisted candidates survive; restart offers resume/review/start-over. |
| A10 | Confirm retried twice | Same request id replays the committed confirmation; no duplicate inventory transition. |
| A11 | Two clients confirm concurrently | One atomic/serialized confirmation commits; stale inventory/review caller receives conflict and reloads. |
| A12 | Air-gapped on-prem | Full slice completes without external network. |
| A13 | Hosted deployment | Only bounded metadata leaves local discovery environment during Slice 01. |
| A14 | Candidate evidence changes after the user reviewed it | Confirmation with the old review revision is rejected even if inventory version is still current. |

# 18. Yigal Review Points

| **ID** | **Point** | **Current target decision** |
| --- | --- | --- |
| Y1 | Orchestrator ownership | Owns application/use-case authority and sequencing; does not become a god service. |
| Y2 | Local Discovery boundary | Logical component/contract now; physical process topology deferred. |
| Y3 | Persistence abstraction | System Design fixes logical entities/versioning/consistency; physical DB schema waits for code audit + implementation design. |
| Y4 | Candidate dimensional state | Availability/support/identity/selection remain separate dimensions. |
| Y5 | Four production responsibilities | Local Application Shell, Source Access, Source Discovery + Candidates, Approval Authority. Challenge ownership, not process count. |
| Y6 | Execution placement | Logical capability contracts are stable; local/cloud/on-prem placement follows data and deployment constraints. |
| Y7 | Confirmation atomicity | Semantics are proven; production multi-process serialization/CAS mechanism remains an Implementation Design choice. |
| Y8 | Capability evidence | Appendices map each capability to selected pattern, empirical proof, limitations, and remaining implementation questions. |

These are review points, not open blockers. The Founder has adopted the current target decisions; review may reopen them only with a concrete architectural reason.

# 19. Explicitly Deferred Decisions

* Additional session providers and exact provider file/API formats beyond the validated initial local-session pattern.
* Concrete discovery time-window default and product tuning.
* REST vs gRPC vs IPC or other physical transport between logical responsibilities.
* Database/storage technology, physical schema, and the concrete multi-process atomic/CAS mechanism.
* Exact process/container topology, including whether a hosted experience later uses a local agent/runtime.
* Cloud vendor and infrastructure services.
* Additional source-type coverage and provider-host/symlink/rename/fork identity edge cases.
* Exact production module/file promotion and migration steps from spike code.
* Retry timing/backoff values and production auth/actor/enterprise ACL integration.
* Final visual UX design.

# 20. Design Verdict and Next Phase

| **Verdict** TARGET SYSTEM DESIGN READY FOR CODE REALITY AUDIT. Slice 01 has a bounded product outcome, explicit authority model, data/state model, persistence and consistency requirements, failure behavior, on-prem portability, low-fi interaction, and acceptance scenarios. |
| --- |

Verdict: SYSTEM DESIGN VALIDATED AGAINST CODE REALITY — READY FOR YIGAL ARCHITECTURE REVIEW. The critical Slice 01 seams were decomposed into capabilities, solution-planned where uncertainty was material, empirically tested in eight bounded spikes, then audited against the current codebase and reconciled. No major rewrite, new microservice topology, separate Slice 00, or new security/server layer is justified by current evidence. After architecture review, the next phase is Implementation Design: map the four production responsibilities to exact production modules, storage/concurrency mechanisms, migration steps, and build sequence.

# Appendix A — Capability Coverage Matrix

This appendix is organized by capability, not by spike. The spikes are empirical evidence for the capability decisions; they are not proposed production components.

|  |  |  |  |  |  |
| --- | --- | --- | --- | --- | --- |
| **Capability** | **Production owner** | **Selected pattern** | **Placement** | **Evidence** | **Status** |
| Repo access | R-2 Source Access | Bounded local adapter; Git mechanics below seam | Local / On-Prem; remote source may execute elsewhere | Spike 01 | PROVEN |
| Folder access | R-2 Source Access | Separate folder adapter behind same Source Access contract | Local / On-Prem | Spike 02 | PROVEN |
| Application → Source Access | R-1 ↔ R-2 | Small explicit typed dispatch; no registry/DI framework | Topology-neutral logical seam | Spike 03 | PROVEN |
| Recent session discovery | R-3 Source Discovery + Candidates | Metadata-first bounded discovery; no transcript/body semantic ingestion | Local/customer environment for local sessions | Spike 04 | PROVEN within tested provider pattern |
| Source identity / dedup | R-3 Source Discovery + Candidates | Conservative deterministic relation; ambiguity preserved | Topology-neutral logic | Spike 05 | PROVEN with documented identity limits |
| DiscoveryRun orchestration | R-3 Source Discovery + Candidates | Durable run + work-unit idempotency + incremental persistence | Topology-neutral logic | Spike 06 | PROVEN |
| Candidate evidence / review model | R-3 Source Discovery + Candidates | Append-only evidence + deterministic four-dimensional projection | Topology-neutral logic | Spike 07 | PROVEN |
| Inventory confirmation | R-4 Approval Authority | Explicit confirmation + request idempotency + inventory version + review revision | Topology-neutral semantics; physical serialization TBD | Spike 08 | PROVEN semantics; physical multi-process CAS TBD |

# Appendix B — Capability Solution Planning & Empirical Validation

## B.1 Capability: Local Repository Access

*Evidence artifact: Spike 01*

**Need:** Identify and minimally validate a repository where it resides, without moving Git mechanics into UI/application authority or uploading the repo.

**Solution planning:** Patterns considered included local ownership/access separation (GitHub Desktop), execution near the resource (VS Code-style local runtime/extension), local/cloud execution separation and browser handoff (Claude Code), and browser-to-local-runtime communication (Tailscale-style local Web UI). Selected pattern: Source Access abstraction; execution follows the data.

**Empirical proof:** Valid Git repo with remote; repo without remote; nonexistent path; non-Git directory; UI/application boundary checks; offline/local execution; restart.

**Verdict:** PROVEN. A browser-facing experience can identify a local repository through a bounded, replaceable Source Access capability without cloud execution or UI-owned Git mechanics.

**Limits:** Production auth/hardening and exact deployment topology remain Implementation Design concerns. Branch-name metadata was not required to establish the architectural seam.

## B.2 Capability: Local Folder Access

*Evidence artifact: Spike 02*

**Need:** Support a second local source type without creating a parallel architecture or letting Web/application code own filesystem mechanics.

**Solution planning:** Reuse the Source Access pattern, but keep folder validation mechanically distinct from Git. The same logical contract does not imply the same adapter implementation.

**Empirical proof:** Valid directory; missing path; file-not-directory; permission denied; Git repo treated explicitly as folder without Git mechanics; UI boundary; metadata-only inspection; shared Source Access pattern.

**Verdict:** PROVEN. Folder access fits the same Source Access responsibility without a competing path.

**Limits:** OS readability is only a technical fact; it is not Propperly authorization.

## B.3 Capability: Application → Source Access Contract

*Evidence artifact: Spike 03*

**Need:** Let application logic request source inspection by declared intent without knowing Git/filesystem mechanics.

**Solution planning:** Compared a direct typed router, registry-style routing, and more generic abstraction. With two adapters, the explicit typed router was the smallest complete pattern; registry/DI infrastructure was rejected as premature.

**Empirical proof:** Repo and folder both route through one exported inspection function; unknown kinds fail explicitly; no heuristic kind inference; no source mechanics above seam; metadata-only result.

**Verdict:** PROVEN. A small explicit dispatch seam is sufficient for current source types.

**Limits:** Declared repo against a plain directory can surface observed-kind mismatch; the mismatch is explicit rather than silently hidden.

## B.4 Capability: Recent Session Discovery

*Evidence artifact: Spike 04*

**Need:** Bootstrap discovery from recent analyst work without semantically ingesting session bodies or inventing source kinds.

**Solution planning:** Metadata-first bounded discovery. Only allowlisted session fields/signals may produce source references; missing evidence yields unknown rather than invented classification.

**Empirical proof:** Bounded session enumeration, provider encoding, no source-kind invention, positive/behavioral body-field allowlist falsification, and preserved reference provenance.

**Verdict:** PROVEN for the tested local session-provider pattern.

**Limits:** Additional providers and their exact formats remain future adapters; the proof does not claim universal session-provider coverage.

## B.5 Capability: Conservative Source Identity

*Evidence artifact: Spike 05*

**Need:** Group repeated discovery references while avoiding false merges, false move inference, and path-as-identity.

**Solution planning:** Ordered deterministic evidence hierarchy: contradictory external identity → DIFFERENT; exact normalized locator → SAME\_LOCATOR; same owner/name at different locators → AMBIGUOUS; missing/weak evidence → AMBIGUOUS. No fuzzy scoring.

**Empirical proof:** Exact/equivalent locator, contradictory remotes, multiple clones, no-remote repos, moved-looking paths, basename near-misses, provenance preservation, and human-authority preservation.

**Verdict:** PROVEN with limits. Conservative grouping/relations work without fuzzy auto-merge.

**Limits:** Symlink equivalence, provider-host disambiguation, case normalization, rename/fork/mirror semantics remain unresolved implementation/research details.

## B.6 Capability: DiscoveryRun Orchestration

*Evidence artifact: Spike 06*

**Need:** Coordinate bounded discovery with durable progress, restart/resume, per-item failure, retry safety, and no duplicate work.

**Solution planning:** Reuse the proven run/checkpoint/log shape already present in the codebase, but keep Slice 01 discovery lifecycle semantics separate from unrelated run domains. No workflow engine or queue.

**Empirical proof:** New run, incremental persistence, interruption/restart, resume, work-unit idempotency, duplicate locator provenance, item failure, retry, cancellation, policy snapshot, separate-process reload.

**Verdict:** PROVEN. Durable orchestration does not require a workflow framework.

**Limits:** Production storage technology and operational backoff/timing remain deferred.

## B.7 Capability: Candidate Evidence & Review

*Evidence artifact: Spike 07*

**Need:** Represent pre-approval candidate state without collapsing independent technical facts and human decisions into one mutable enum.

**Solution planning:** Append-only evidence and selection-decision logs; deterministic projection rebuilt from evidence. Four independent folds: availability, support, identity, selection.

**Empirical proof:** Incremental persistence, immutable prior records, deterministic replay, independent dimension changes, decision reversal, multi-candidate isolation, ambiguity relation, provenance merge, subprocess restart.

**Verdict:** PROVEN. The four-dimensional candidate model holds and remains rebuildable without a projection-state file.

**Limits:** This is pre-approval state only; it does not create Source authority.

## B.8 Capability: Approval / Inventory Authority

*Evidence artifact: Spike 08*

**Need:** Cross from reviewed pre-approval state to an authoritative inventory exactly once, while detecting stale inventory and stale review state.

**Solution planning:** Adopt the codebase's established append-only + operation-id idempotency + optimistic-concurrency pattern at the correct pre-approval authority layer, without reusing canonical world-domain operations directly. Add review-state binding because inventory version alone cannot detect candidate changes after review.

**Empirical proof:** Initial confirmation, no authority from INCLUDED alone, exact retry/restart replay, stale inventory conflict, stale review conflict, serialized concurrent confirmation, failure before commit, crash after commit, multi-ref atomic logical commit, evidence immutability.

**Verdict:** PROVEN at the semantic/single-writer proof level. Confirmation is the sole Slice 01 authority transition.

**Limits:** True multi-process mutual exclusion/CAS was not proven; the production atomic/serialized mechanism must be selected in Implementation Design.

# Appendix C — Remaining Unproven / Implementation-Design Questions

* Physical production mechanism for multi-process atomic/serialized inventory confirmation.
* Exact module/file promotion from spike code into production responsibilities and the migration sequence.
* Production auth/actor model, enterprise ACL integration, and permission provisioning.
* Exact local/hosted/hybrid process topology and transport; logical contracts are intentionally topology-neutral.
* Additional session providers and remote/API source adapters.
* Identity edge cases not proven by the current evidence: provider-host normalization, symlink equivalence, repo rename/fork/mirror semantics, and case normalization.
* Final persistence technology/schema and operational retry/backoff values.
* Final UX visual design and enterprise deployment/installer mechanics.