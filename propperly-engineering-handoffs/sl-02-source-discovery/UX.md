# SL-02 Source Discovery — UX

**Source:** `architecture/promotion-candidates/sl-02-source-discovery/UX.md`  
**Status:** READY FOR HUMAN REVIEW  
**Critical gap:** The Web Review Interface (state S5) has no existing UI design. It is the only net-new UI component in this slice. See UI.md.

---

## UX principles

1. **One surface, one task.** The discovery wizard has a single job: produce an Approved Source Inventory. It does not serve other product functions.
2. **The system proposes; the human decides.** No source is selected, merged, or approved without an explicit human action.
3. **Transparency over magic.** Every candidate shows its discovery origin, all four dimension values, and why identity is ambiguous (when it is).
4. **Preserve ambiguity, don't hide it.** When two candidates may be the same source, the user sees the conflict and resolves it. The system does not guess.
5. **Confirmation is an explicit gesture.** The user confirms once, deliberately. There is no auto-confirm on timeout.
6. **Returning users are unaffected.** If an Approved Source Inventory already exists, this wizard does not appear. The existing reconstruction flow continues unchanged.
7. **Empty is valid.** A user may confirm with zero sources included. The system proceeds; the UX may show a warning, but does not block.

---

## Six-step journey

### Step 1 — Start

**Trigger:** `propperly start` on a machine with no Approved Source Inventory.  
**System action:** Detects absence of inventory. Launches source discovery wizard in browser.  
**User sees:** Welcome screen. Explanation of what is about to happen.  
**State entered:** S1 (Wizard Initialized)  
**UX requirement:** Make clear this is a one-time setup, not part of normal operation. Duration estimate optional.

---

### Step 2 — Find

**Trigger:** User advances from welcome screen.  
**System action:** Runs bounded discovery. Reads session metadata (metadata-only, no body ingestion). Produces SourceCandidate list.  
**User sees:** A list of candidate sources, each showing: locator, source kind, availability, support status, initial identity note.  
**State entered:** S2 (Discovery Running) → S3 (Candidates Ready)  
**UX requirement:** Show discovery in progress (not instant). Each candidate must display all four dimension values, even when UNKNOWN.

---

### Step 3 — Review

**Trigger:** Candidates are ready.  
**System action:** Presents candidates for review, one by one or as a list.  
**User sees:** Candidates with their four-dimension status. For AMBIGUOUS identity: the two (or more) candidates that may be the same source, with evidence displayed.  
**State:** S3 (Candidates Ready) with user interaction  
**UX requirement:** User can include, exclude, or leave undecided. User can resolve identity: merge (treat as same source) or keep separate. User can add a source by path (not discovered automatically).

---

### Step 4 — Decide

**Trigger:** User signals review complete.  
**System action:** Computes proposed inventory from INCLUDED candidates. Validates completeness.  
**User sees:** Summary of proposed inventory: list of included sources, count of excluded, any UNDECIDED remaining.  
**State entered:** S4 (Selection Complete)  
**UX requirement:** Show the proposed inventory clearly before confirmation. Do not proceed automatically. Allow user to return to review.

---

### Step 5 — Confirm

**Trigger:** User chooses to confirm the proposed inventory.  
**System action:** Calls R-4 Approval Authority. Writes `confirmation_log.ndjson`. Writes Approved Source Inventory.  
**User sees:** Confirmation in progress, then success.  
**State entered:** S5 (Confirmation Pending) → S6 (Confirmed)  
**UX requirement:** Confirmation must be a deliberate action (button click, not passive). Show success state. This is the Web Review Interface's confirmation trigger. *(No design artifact exists yet — see UI.md.)*

---

### Step 6 — Continue

**Trigger:** Confirmation succeeds.  
**System action:** Routes to reconstruction (`bootstrapAndConverge`). Reconstruction uses the Approved Source Inventory as its authorized input.  
**User sees:** Transition to normal Propperly operation.  
**State entered:** S7 (Inventory Active)  
**UX requirement:** Transition must be clear. User should understand reconstruction is beginning.

---

## Seven UX states

| State | Name | Description |
|---|---|---|
| S1 | Wizard Initialized | Discovery wizard launched; no candidates yet |
| S2 | Discovery Running | System executing bounded discovery (metadata-only) |
| S3 | Candidates Ready | Discovery complete; user reviewing candidates |
| S4 | Selection Complete | User has made include/exclude decisions; inventory proposed |
| S5 | Confirmation Pending | User triggered confirmation; R-4 write in progress |
| S6 | Confirmed | Approved Source Inventory written; authority transition complete |
| S7 | Inventory Active | Normal Propperly operation; reconstruction using approved inventory |

---

## Four UI surfaces

| Surface | State | Notes |
|---|---|---|
| **Welcome / Initialization** | S1 | Static; explains purpose and scope |
| **Discovery Progress** | S2 | Shows discovery running; candidate count updating |
| **Candidate Review Interface** | S3, S4 | Complex: list view, dimension display, include/exclude/resolve actions, identity conflict display. **Web Review Interface — no design artifact exists** |
| **Confirmation + Success** | S5, S6 | Triggers R-4; shows confirmation in progress and success |

---

## Critical design gap: Web Review Interface

The Candidate Review Interface (states S3/S4, surface 3) is the only component in SL-02 that requires net-new UI work. All other surfaces are extensions of existing UI patterns in `onboarding_server`.

**What it must do (minimum for SL-02):**

1. List source candidates with all four dimension values visible
2. Include / exclude action per candidate
3. Identity conflict display: show evidence for AMBIGUOUS pairs
4. Identity resolution: merge or keep-separate action
5. Add-by-path: allow user to add a source not discovered automatically
6. Inventory summary view before confirmation
7. Confirmation trigger (button → calls R-4 API)

**What it must NOT do (out of scope for SL-02):**

- Source management (edit/remove after approval) — this is SL-03
- Reconstruction configuration — separate surface
- Analytics display — separate surface

The design track for this interface is DESIGN_NOT_STARTED (see UI.md). Engineering's Implementation Design should scope the backend API surface that the Web Review Interface will consume; the visual design follows.
