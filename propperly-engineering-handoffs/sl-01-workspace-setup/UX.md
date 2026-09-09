# SL-01 Workspace Setup — UX

**Source:** Distilled from `SLICE_PRODUCT_BRIEF.md §I` (UX Intent) and `SLICE_SYSTEM_DESIGN.md` §2 (8 system scenarios)
**Status:** DERIVED — from product brief §I and system design scenarios; not independently reviewed by Design

---

## UX principles

1. **SL-01 is invisible when it can be.** For returning users with one workspace, the system should resume without asking anything.
2. **The system proposes; the human decides.** Workspace creation requires an explicit action. Multi-workspace selection requires an explicit choice.
3. **Explicit failure over phantom state.** A stale locator surfaces as an error — the user does not see a "broken workspace" that appears open but cannot operate.
4. **Fail closed, inform clearly.** Access denied and identity failures surface clean error messages and direct the user to resolution. The product does not attempt to proceed without confirmed right-to-enter.
5. **First-time users should not see architecture.** No internal IDs, state machine labels, spike names, or capability identifiers should appear in the UX.

---

## Five UX states

### State 1: NO_WORKSPACE — Workspace Creation Flow

**Scenario A: First Run**
**Trigger:** `propperly start` on a machine with no workspace.
**System action:** Detects zero accessible workspaces. Presents workspace creation flow.
**User sees:** A minimal creation surface — a name field and a location designation. Possibly a brief explanation that this is a one-time setup.
**Outcome:** Workspace record created; workspace_id persisted by R-WL; state-aware dispatch proceeds to SL-02.
**UX requirement:** Should feel short. Not a multi-step wizard. User should understand "Propperly is setting up a workspace for me, then it will be ready."

---

### State 2: SINGLE_PRE_COMMISSION — Auto-Open, Then SL-02

**Scenario B: Re-Open Known Workspace (exactly 1, no SourceInventory yet)**
**Trigger:** `propperly start` with one accessible workspace; WorkspaceState = `PRE_COMMISSION`.
**System action:** Auto-opens (FD-2). Re-checks right-to-enter at open time. Routes to SL-02.
**User sees:** Effectively nothing — the transition to Source Discovery is seamless.
**UX requirement:** No selection prompt. No "opening workspace" dialog unless the operation takes perceptible time.

---

### State 3: SINGLE_BEYOND_SL01 — Auto-Open, Then SL-02

**Scenario B: Re-Open Known Workspace (exactly 1, SourceInventory exists)**
**Trigger:** `propperly start` with one accessible workspace; WorkspaceState = `BEYOND_SL01`.
**System action:** Auto-opens (FD-2). Re-checks right-to-enter. Routes to SL-02, which owns the downstream state machine.
**User sees:** Normal Propperly operation resumes. SL-02 handles the returning-user path.
**UX requirement:** Same as State 2 — seamless; no selection prompt.

---

### State 4: MULTIPLE — Workspace Selection

**Scenario C: Multiple Accessible Workspaces (2+)**
**Trigger:** `propperly start` with two or more accessible workspaces.
**System action:** Presents workspace selection list (FD-2).
**User sees:** A list of accessible workspaces. Each entry shows minimal metadata: name, last activity (if available). Not a dashboard.
**UX requirement:** Selection is required before proceeding. No default selection without user gesture. After selection, right-to-enter is re-checked for the selected workspace, then SL-02 handoff.

**Scenario D: Admin-Provisioned Workspace**
**Trigger:** User has been granted access to a pre-created workspace by an admin.
**System action:** Workspace appears in the accessible list. If exactly one, auto-open (State 2 or 3). If multiple, selection required (State 4).
**User sees:** No difference from self-created workspace. Admin-created workspaces appear in the same list.

---

### State 5: ACCESS_DENIED — Right-to-Enter Denied

**Scenario E: Right-to-Enter Denied**
**Trigger:** Right-to-enter DENIED at open time (either at enumeration or at open-time re-check).
**System action:** No SL-02 handoff. Error surfaced.
**User sees:** An authorization failure message. Directed to contact whoever manages workspace access. NOT "workspace not found" — the user knows the workspace exists but they cannot enter it.
**UX requirement:** Failure is explicit. The user is not left in an ambiguous state. If multiple workspaces exist and one is denied, the user is returned to the workspace selection screen.

---

## Additional scenarios

### Stale locator — Scenario F

**Trigger:** Workspace is in the registry, but the locator (filesystem path) is no longer reachable.
**System action:** `LOCATOR_STALE` state; no SL-02 handoff.
**User sees:** A locator-inaccessible error. Distinct from authorization failure. Message explains the workspace path is unavailable, not that access was denied. The workspace record is preserved — R-WL does not delete it automatically.
**UX requirement:** The user should understand this is a locator problem (the path moved or is unavailable), not a permission problem. Ideally, the user is presented with a way to update the locator or acknowledge a broken workspace.

### Restart recovery — Scenario H

**Trigger:** Application was closed after workspace creation but before SL-02 committed any state.
**System action:** On restart, R-WL finds the workspace record. WorkspaceState = `PRE_COMMISSION`. Routes to SL-02 as if fresh.
**User sees:** Propperly opens as if continuing where it left off. SL-01's durability guarantee means the workspace creation is not lost — the user does not need to re-create it.
**UX requirement:** Transparent recovery. The user is not shown a "you were in the middle of setup" screen unless necessary.

### Identity unresolvable — Scenario G

**Trigger:** Authentication context is ambiguous or unavailable.
**System action:** No workspace enumeration. No workspace open. Clean error.
**User sees:** An authentication error message. Directed to authentication resolution (outside SL-01 scope).
**UX requirement:** No partial state. The user should not see a workspace list or creation flow if identity is not resolved.

---

## Mapping to system scenarios

| Scenario | UX State | User experience |
|---|---|---|
| A — First Run | NO_WORKSPACE (State 1) | Workspace creation flow |
| B — Re-Open (PRE_COMMISSION) | SINGLE_PRE_COMMISSION (State 2) | Seamless auto-open → SL-02 |
| B — Re-Open (BEYOND_SL01) | SINGLE_BEYOND_SL01 (State 3) | Seamless auto-open → SL-02 |
| C — Multiple Workspaces | MULTIPLE (State 4) | Workspace selection screen |
| D — Admin-Provisioned | State 2, 3, or 4 depending on count | Same as corresponding state |
| E — Right-to-Enter Denied | ACCESS_DENIED (State 5) | Auth failure message |
| F — Locator Gone | LOCATOR_STALE | Locator error message |
| G — Identity Unresolvable | (pre-state) | Auth resolution error |
| H — Restart | SINGLE_PRE_COMMISSION (State 2) | Seamless recovery → SL-02 |
