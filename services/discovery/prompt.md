# SL-02 Source Discovery — Implementation Prompt Log

## Session: 2026-09-09

### Task (original, Hebrew)
1. Complete development of all recommendations in `IMPLEMENTATION_DESIGN_en.md` until it is a product
2. Create a run script for this project
3. Keep all rules of the documents

---

## What Was Built (Conversation Summary)

Starting from placeholder stubs, the full Stage 1 implementation was completed across four milestones.

### Foundation (pre-existing, confirmed intact)
- `app/src/domain/types.ts` — all 9 domain entities, 4-dimension candidate model, logical interfaces
- `storage/src/append-store.ts` — NDJSON append-only store, atomic write (tmp+rename)
- `data-center/src/paths.ts` — all file path helpers pointing to `~/.propperly/workspaces/`

### Types updated
- `app/src/domain/types.ts`: added `activeRunId?: RunId` to `Workspace`; added `runId: RunId` to `CandidateEvidenceRecord`

### Data Center Stores (Phase 1)
| File | Purpose |
|---|---|
| `data-center/src/workspace-store.ts` | persist/read/update workspace, find by CWD, NDJSON workspace index |
| `data-center/src/discovery-store.ts` | persist/read/update DiscoveryRun, scan for RUNNING/INTERRUPTED run |
| `data-center/src/candidate-store.ts` | append-only evidence + selection decisions |
| `data-center/src/inventory-store.ts` | atomic inventory write, append-only confirmation receipts, idempotency lookup |

### M1 — Source Access (`services/discovery/source-access/index.ts`)
- `inspectSourceCandidate(locator, kind)` — dispatches by kind
- Git repo adapter: checks `.git` dir, runs `git remote -v`, returns remote as `STRONG` identity evidence
- Folder adapter: checks stat + readdir for accessibility
- All proof cases covered (AVAILABLE/INACCESSIBLE/SUPPORTED/UNSUPPORTED)

### M2 — Discovery (`services/discovery/discovery/`)
| File | Purpose |
|---|---|
| `policy.ts` | `computeEffectivePolicy` — user can only narrow, never expand |
| `identity.ts` | `resolveIdentityRelation` — conservative SAME_LOCATOR/DIFFERENT/AMBIGUOUS |
| `projection.ts` | `projectCandidate` — 4-dimensional fold (availability, support, identity, selection) |
| `providers/filesystem-provider.ts` | scans CWD ancestry + home subdirectories for git repos |
| `orchestrator.ts` | `startDiscoveryRun`, `executeDiscovery` (async, incremental), `resumeDiscoveryRun` |
| `index.ts` | public API: `beginDiscoveryRun`, `getRunView`, `recordSelection`, `resolveIdentityConflict`, `addCandidate`, `getIncludedRefs` |

### M3 — Approval (`services/discovery/approval/`)
| File | Purpose |
|---|---|
| `revision.ts` | `computeReviewRevision` — SHA-256 hash of sorted candidate projections |
| `index.ts` | `confirmInventory` — idempotency by requestId, CAS on inventory version + review revision, `StaleInventoryError`/`StaleReviewError` |

### M4 — Routes (`services/discovery/routes/index.ts`)
All `DiscoveryApi` endpoints implemented under `/api/discovery/*`:
- `GET /api/discovery/workspace` — `{ workspace_id, has_approved_inventory, state }`
- `POST /api/discovery/runs` — start/resume run, execute discovery async
- `GET /api/discovery/runs/:runId` — full run view with projected candidates
- `POST /api/discovery/runs/:runId/selections` — record INCLUDED/EXCLUDED
- `POST /api/discovery/runs/:runId/identity` — resolve identity conflict
- `POST /api/discovery/runs/:runId/candidates` — add candidate by path
- `GET /api/discovery/runs/:runId/proposed-inventory` — `{ included_refs, review_revision, version }`
- `POST /api/discovery/inventory/confirm` — CAS confirmation → `ConfirmationReceipt`

### Services Entry Point (`services/src/index.ts`)
Express server on `PORT` (default 3001), workspace resolved from `PROPPERLY_CWD` env var.

### Run Scripts
- `run-discovery.ps1` — Windows PowerShell
- `run-discovery.sh` — Unix bash

---

## Verified End-to-End (integration test, 2026-09-09)
```
POST /api/discovery/runs              → { run_id }
GET  /api/discovery/runs/:id          → status=COMPLETED, 1 candidate (GIT_REPO, AVAILABLE)
POST /api/discovery/runs/:id/selections → 204
GET  /api/discovery/runs/:id/proposed-inventory → included_refs=[...], review_revision="e4a5b030be095ae8"
POST /api/discovery/inventory/confirm → inventoryVersion=1, 1 source approved
GET  /api/discovery/workspace         → has_approved_inventory=true, state=INVENTORY_APPROVED
```

---

## Constraints Preserved (from IMPLEMENTATION_DESIGN_en.md)
- No new HTTP server/port — routes mount on existing `services` Express surface
- No `engine`/`data-center` RPC — Stage 1 uses local files only
- `source-access/` never owns discovery logic or approval
- `discovery/` never automates `selection` — INCLUDED/EXCLUDED is human-only
- `approval/` is the ONLY module that performs candidate → Source transition
- Single-writer invariant (Stage 1) — documented, not enforced by lock
- Evidence is append-only — projection is always rebuildable from logs
- Confirmation is idempotent by `requestId`
- No semantic ingestion — only metadata (locator, kind, availability, remote URL)
