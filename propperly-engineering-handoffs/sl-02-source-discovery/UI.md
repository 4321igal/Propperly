# SL-02 Source Discovery — UI

**Status: PENDING DESIGN TRACK**

---

## No accepted UI design exists for this slice

As of 2026-09-08, no visual design, wireframe, component specification, or design system artifact exists for the Source Discovery UI surfaces.

This is not an oversight — the Design track for the Candidate Review Interface (Web Review Interface, UX state S3/S4) is classified as `DESIGN_NOT_STARTED` in the architecture record (B-08).

---

## What Yigal should know

**Yigal is NOT blocked on UI.md for backend work.**

The backend components — R-2 Source Access, R-3 Discovery Orchestration, R-4 Approval Authority — can be implemented without a visual design. The API surface that the Web Review Interface will consume is a backend design decision (Implementation Design scope).

The Implementation Design should define the API contracts that the future Web Review Interface will call. The visual design follows the API contracts.

---

## Scope of UI work required

From UX.md, four surfaces are needed:

1. **Welcome / Initialization** (S1) — Simple static page. Extends existing onboarding_server HTML patterns. Low design complexity.
2. **Discovery Progress** (S2) — Progress indicator + candidate count. Low design complexity.
3. **Candidate Review Interface** (S3, S4) — The complex surface. Requires design work. See UX.md for minimum functional requirements.
4. **Confirmation + Success** (S5, S6) — Confirmation button + success state. Low design complexity.

The Candidate Review Interface is the only surface requiring significant design effort.

---

## What the design track must produce

Before Engineering can build the Web Review Interface, the design track must deliver:

1. Wireframes for the Candidate Review Interface (S3/S4)
2. Candidate card component design: how four-dimension status is displayed
3. Identity conflict presentation: how AMBIGUOUS pairs are shown and resolved
4. Confirmation flow: what the user sees from confirm-button to success screen
5. Error states: what happens if confirmation fails, if a source is inaccessible, if discovery finds nothing

---

## When to engage Design

The design track may begin independently of Engineering's Implementation Design. The minimum input it needs:

- UX.md (this handoff package) — the semantic requirements and state model
- API surface defined by Engineering's Implementation Design (what data is available for display)

The design track does not need to wait for backend implementation to produce wireframes.

---

## Temporary host

Until a Design track is established, the responsible owner for triggering the design track is Architecture (handoff ownership). Yigal should flag if Implementation Design reveals constraints that affect the UI scope defined in UX.md.
