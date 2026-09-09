# SL-01 Workspace Setup — Product

**Source:** `architecture/slices/sl-01-workspace-setup/SLICE_PRODUCT_BRIEF.md`
**Status:** APPROVED — FD-1/FD-2/FD-3 all resolved as of 2026-09-08

---

## Product outcome

When SL-01 is complete, the following customer-observable states are true:

1. A Propperly workspace exists — a named, initialized workspace with a stable `workspace_id` persisted on disk.
2. The workspace is open and active — it is the current context for the running application session.
3. The user is associated with the workspace — execution identity is resolved.
4. The user is allowed to enter it — right-to-enter confirmed (ACL gate returned GRANTED at open time).
5. The environment is ready for Source Discovery — the application shell (C15) is running, the workspace has an empty source-authority state, and state-aware dispatch has routed the session to SL-02.

The workspace is explicitly **not** commissioned. It has no Source Inventory. It has no knowledge world.

**Operating Map planning status note:** The PROPPERLY_PRODUCT_OPERATING_MAP_V1.xlsx records SL-01 planning status as "Not Started" with all specs "Missing." This reflects the pre-existing operating map state. The architectural pre-work (product brief, system design, capability decomposition, proofs, reconciliation) is complete as of 2026-09-08; the operating map will be updated after Engineering review.

---

## Slice identity

| Field | Value |
|---|---|
| **Slice ID** | SL-01 |
| **Name** | Workspace Setup |
| **Flow** | FLO-01 — First Run / Initial Commissioning |
| **Capabilities** | C01 (Workspace Lifecycle), C03 (Identity/ACL, execution identity only), C15 (Web Application) |
| **Priority** | P0 |
| **Queue position** | 2 |

---

## Actor model

**Primary actor:** The analyst / end user — the same person who will run Source Discovery. This is the only actor confirmed by existing product documentation.

**FD-1 RESOLVED:** Self-service is the primary SL-01 flow. An admin-created workspace may be *opened* by another user (opening an existing workspace is in SL-01 scope), but organization-level workspace provisioning *for other users* is not owned by SL-01.

---

## Starting states (4 valid entry points)

| Starting state | Trigger |
|---|---|
| No workspace exists at target path (true first run) | User runs `propperly start` for the first time |
| Workspace path known but not yet initialized | User supplies an empty directory |
| Workspace exists, no active discovery | User resumes a session (single workspace) |
| Multiple workspaces exist | User must select one (FD-2 path) |

---

## Ending state (SL-01 guarantees at handoff)

| Property | Value |
|---|---|
| `workspace_id` stable and persisted | YES |
| Workspace open and active | YES |
| Execution identity resolved (`PrincipalRef`) | YES |
| Right-to-enter GRANTED at open time | YES |
| WorkspaceState discriminator | `PRE_COMMISSION` or `BEYOND_SL01` |
| Locator reachable | YES |
| Source Inventory exists | NO |
| Workspace commissioned | NO |
| Knowledge world exists | NO |

---

## FD-2: 0 / 1 / 2+ Workspace Routing (RESOLVED)

**FD-2 RESOLVED:** After identity resolution and post-authorization enumeration:

| Count | Behavior |
|---|---|
| 0 accessible workspaces | Workspace creation flow (self-service, FD-1) |
| 1 accessible workspace | Auto-open transparently (no selection prompt); re-check right-to-enter at open time |
| 2+ accessible workspaces | Explicit workspace selection required; open selected workspace; re-check right-to-enter |

**Authorization invariant:** Enumeration is post-authorization by construction. The routing decision (0/1/2+) is taken on the post-authorization count, never on an unfiltered count. Authorization is re-checked at open time regardless of the enumeration result.

---

## Resolved founder decisions

| Decision | Resolution |
|---|---|
| FD-1: Single-actor vs. multi-actor workspace creation | Self-service is primary; admin-created workspaces may be opened by SL-01; org-level provisioning NOT owned by SL-01 |
| FD-2: Auto-open behavior for a single known workspace | Single workspace: transparent auto-open (no gesture). Multiple: explicit selection required |
| FD-3: C03 scope within SL-01 | SL-01 resolves execution identity and enforces existing right-to-enter. Does NOT own role/ACL administration or policy authoring |

---

## In scope

| Responsibility | Evidence |
|---|---|
| Create a new workspace (initialize workspace_id, persist empty WorkspaceState) | System Design §9: "Initialize Workspace" |
| Open an existing workspace (load WorkspaceState, set active context) | System Design §9: state-aware dispatch |
| Select among available workspaces (when 2+ exist) | FD-2 |
| Resolve current execution identity (who is running this session) | System Design §9 step 1 |
| Validate right-to-enter (path read/write; enterprise ACL enforcement scope per FD-3) | FD-3 |
| State-aware dispatch to SL-02 | System Design §9 and R-1 definition |
| Product entry via Web Application shell (C15) | Operating Map |

## Out of scope

| Item | Classification |
|---|---|
| Source Discovery | Owned by SL-02 |
| Source Management | Owned by SL-03 or later |
| Reconstruction / knowledge creation | Not owned by SL-01 |
| Role assignment, ACL policy authoring | Not owned by SL-01 (FD-3) |
| Org-level workspace provisioning for other users | Not owned by SL-01 (FD-1) |
| Commissioning | Not owned by SL-01 — SL-01 ends pre-commission |
| Enterprise ACL policy authoring | Out of scope (Q8 from CROSS_SLICE_IMPACT.md: OPEN) |

**SL-01 must NOT create:** Source, SourceCandidate, DiscoveryRun, SourceInventory, IdentityEvidence, CandidateDisposition, ConfirmationReceipt.

---

## Authority events

1. **Create workspace** — the user explicitly initiates workspace creation. Human-controlled.
2. **Select workspace** (conditional) — when 2+ workspaces are accessible, the user explicitly selects one. No auto-selection without user confirmation unless exactly one workspace exists (FD-2).

---

## UX intent

**First run, no workspace:** Short, transparent initialization. User senses "Propperly is getting ready." Immediately transitions to Source Discovery.

**Returning user, one workspace:** Nearly invisible. System resumes the known workspace automatically and dispatches to the appropriate state.

**Returning user, multiple workspaces:** A brief, clean workspace-selection moment. Shows workspaces the user has access to with minimal metadata (name, last activity). Not a dashboard — a selection step.

**Customer goal:** "I opened Propperly and it knew what to do."

---

## Handoff to SL-02

**SL-01 guarantees before SL-02 may begin:**

1. A stable `workspace_id` exists and is persisted (in R-WL registry).
2. The workspace path is initialized with an empty `WorkspaceState` (no DiscoveryRun, no SourceInventory).
3. Execution identity resolved — system knows who is operating this session.
4. Right-to-enter GRANTED at open time.
5. Locator is reachable at handoff time.

**SL-01 must NOT do on behalf of SL-02:** create Source, SourceCandidate, DiscoveryRun, SourceInventory, IdentityEvidence, CandidateDisposition, or ConfirmationReceipt.

---

## Slice 00 finding

**Question:** Does SL-01 include customer-facing environment / deployment provisioning?

**Finding:** NOT SUPPORTED BY PRODUCT SOURCES. `CUSTOMER_POC_RUNBOOK.md §2` explicitly excludes Node.js, npm, and git installation from the product. C17 (Deployment & Environment Management) is NOT listed in the Operating Map for SL-01. The System Design bootstrap (`propperly start`) assumes the runtime environment is already present.

**Open question:** Does C17 need its own slice ("Slice 00")? Surfaced as an Operating Map question for the founder, not an SL-01 responsibility.
