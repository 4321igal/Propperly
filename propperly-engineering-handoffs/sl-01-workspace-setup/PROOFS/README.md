# SL-01 Workspace Setup — Proof Index

**Canonical source:** `architecture/slices/sl-01-workspace-setup/PHASE_5_TECHNICAL_PROOFS.md`
**Spike test files:** `propperly-local-poc/src/spike/workspace_registry.test.ts` (SPIKE-A), `propperly-local-poc/src/spike/workspace_authorization.test.ts` (SPIKE-B)
**Total proofs:** 26 (14 SPIKE-A + 12 SPIKE-B)
**Cost:** $0 — all proofs are local, offline, no model calls

---

## SPIKE-A Verdict

**PROVEN** — All 14 cases (A1–A14) pass.

Registry-authoritative workspace identity (workspace_id independent of locator), creation-intent idempotency, registry durability across fresh OS process, explicit locator-conflict error, and LOCATOR_UNREACHABLE state are all empirically demonstrated.

**Test file:** `src/spike/workspace_registry.test.ts`
**Run command:** `node --test --experimental-strip-types src/spike/workspace_registry.test.ts`
**Runtime:** 708ms, $0, offline

---

## SPIKE-A Case Table (A1–A14)

| Case | Claim | Verdict | Evidence |
|---|---|---|---|
| A1 | workspace_id opaque, not derived from locator substring | PROVEN | ws_ prefix + no locator substring present |
| A2 | workspace_id ≠ creation_intent_id (separate values) | PROVEN | Different values confirmed |
| A3 | workspace_id stable across in-process re-open | PROVEN (PARTIAL — in-process only; A12 is the cross-process proof) | In-process stability confirmed |
| A4 | locator is mutable; workspace_id immutable | PROVEN | setLocator() changes locator, workspace_id unchanged |
| A5 | LOCATOR_UNREACHABLE when locator path absent | PROVEN | existsSync(locator) = false → LOCATOR_UNREACHABLE |
| A6 | REACHABLE when locator path exists | PROVEN | mkdirSync(locator) then checkLocatorReachability = REACHABLE |
| A7 | LOCATOR_UNREACHABLE preserves workspace record | PROVEN | getById() returns full record after LOCATOR_UNREACHABLE |
| A8 | same creation_intent_id → same workspace_id (replay) | PROVEN | Second call returns identical record, list().length=1 |
| A9 | replay ignores different locator argument (CURRENT SPIKE BEHAVIOR — see note) | PROVEN | Original locator preserved on replay |
| A10 | different intent + owned locator → LocatorConflictError | PROVEN | error.name=LocatorConflictError, "Explicit resolution required" |
| A11 | different intents + different locators → two workspaces | PROVEN | list().length=2, each accessible |
| A12 | registry persists across fresh Node.js process (subprocess) | PROVEN | spawnSync reads same workspace_id from disk |
| A13 | getByLocator correct after locator mutation | PROVEN | Old locator→undefined, new locator→record |
| A14 | two registries with same locator → different workspace_ids | PROVEN | Registry-authoritative identity, not locator-derived |

**Note on A9:** A9 proves the current spike behavior (REPLAY_IGNORE — silent return on same intent_id + different locator). This is NOT a settled architectural choice. OD-A9 is RESOLVED in Phase 7 as CONFLICT (same intent_id + materially different input → explicit error). The production implementation must NOT use the REPLAY_IGNORE spike behavior — it is documented and overridden.

---

## SPIKE-B Verdict

**PROVEN** (with B9 PARTIAL — E1 namespace gap is a documented design decision, not a contradiction).

Both mandatory checks (`listAccessibleWorkspaces` + `canEnterWorkspace`) are implementable. Differentiated per-workspace access proven. B5 proves that revocation is visible at open time — the mandatory second check closes the active-revocation window that enumeration alone cannot close.

**Test file:** `src/spike/workspace_authorization.test.ts`
**Run command:** `node --test --experimental-strip-types src/spike/workspace_authorization.test.ts`
**Runtime:** 158ms, $0, offline

---

## SPIKE-B Case Table (B1–B12)

| Case | Claim | Verdict | Evidence |
|---|---|---|---|
| B1 | listAccessibleWorkspaces includes ACTIVE-grant workspaces | PROVEN | List contains ws-x |
| B2 | listAccessibleWorkspaces excludes non-granted workspaces | PROVEN | List does not contain ws-y |
| B3 | canEnterWorkspace returns true for ACTIVE grant | PROVEN | Returns true |
| B4 | canEnterWorkspace throws AccessDeniedError with no grant | PROVEN | error.name=AccessDeniedError |
| B5 | revoke between enumerate and open → canEnterWorkspace throws (revocation visible at open time) | PROVEN | listBefore=[ws-x]; revokeAccess; canEnterWorkspace throws "REVOKED" — load-bearing second check |
| B6 | Principal A → WS-X only, Principal B → WS-Y only | PROVEN | listA=[ws-x], listB=[ws-y] |
| B7 | canEnterWorkspace differentiates: A enters WS-X, B denied | PROVEN | A=true, B throws AccessDeniedError |
| B8 | listAccessibleWorkspaces excludes REVOKED grants | PROVEN | ws-z (REVOKED) excluded, ws-x (ACTIVE) included |
| B9 | E1 WorkspaceAccess namespace gap: org_id not in SL-01 grant | PARTIAL | Grant has no organization_id; OD-B9 RESOLVED in Phase 7 — global UUID is strictly stronger than org-scoped uniqueness; namespace gap is a documented design decision |
| B10 | grantAccess is idempotent | PROVEN | Same grant_id, 1 ACTIVE record |
| B11 | re-grant after revoke creates new ACTIVE grant | PROVEN | New grant_id, coexists with revoked |
| B12 | principal_id is sole identity key (no display_name/email) | PROVEN | Grant has no display_name/email; different pid → no access |

---

## Capability Coverage

| Capability | Cases | Verdict |
|---|---|---|
| CAP-SL01-01: registry-authoritative workspace identity | A1, A14 | PROVEN |
| CAP-SL01-02: workspace_id immutable through locator change | A4 | PROVEN |
| CAP-SL01-03: creation-intent idempotency (Stripe pattern) | A8, A9 | PROVEN (A9 semantic overridden by OD-A9) |
| CAP-SL01-04: locator collision surfaces as explicit CONFLICT | A10 | PROVEN |
| CAP-SL01-05: LOCATOR_UNREACHABLE state | A5, A7 | PROVEN |
| CAP-SL01-06: filtered workspace enumeration | B1, B2, B6, B8 | PROVEN |
| CAP-SL01-07: mandatory open-time re-authorization | B3, B4, B5 | PROVEN — B5 is load-bearing |

---

## What was NOT proven (explicit limits)

- **Production storage technology:** JSON file is the spike vehicle. Phase 8 must select the production store (JSON or SQLite; ADL-005 constraint).
- **Locator normalization:** Spike uses raw path strings. Two representations of the same path = two locators. Phase 8 must wire `safeResolveWithin()` before all locator writes.
- **Grant persistence:** SPIKE-B grant store is in-memory only. Phase 8 must wire the grant table into a durable co-located store.
- **A3 cross-process (GRADED PARTIAL):** A3 is in-process re-open only. A12 provides the full cross-process durability proof. Together they are fully proven; A3 alone would be PARTIAL.
- **CONFLICT idempotency semantic:** A9 proves the SPIKE's REPLAY_IGNORE behavior. The production CONFLICT semantic (OD-A9 resolved) is a design decision, not a proof.
