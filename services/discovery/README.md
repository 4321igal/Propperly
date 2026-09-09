# Discovery

SL-02 Source Discovery — Stage 1 implementation module, run as an internal
part of the `services` process (no new server, no new port). Produces the
Approved Source Inventory that gates reconstruction. All code for this
project lives under this folder.

**Design doc:** [`propperly-engineering-handoffs/sl-02-source-discovery-software/IMPLEMENTATION_DESIGN_en.md`](../../propperly-engineering-handoffs/sl-02-source-discovery-software/IMPLEMENTATION_DESIGN_en.md)
(Hebrew translation: `IMPLEMENTATION_DESIGN_he.md` in the same folder)

**Product / architecture source:** [`propperly-engineering-handoffs/sl-02-source-discovery/`](../../propperly-engineering-handoffs/sl-02-source-discovery/README.md)

## Not allowed to do

- `source-access/` (R-2) may not own discovery orchestration, candidate
  logic, or approval — it is a typed access seam only.
- `discovery/` (R-3) may not perform semantic ingestion (no
  `scanLocalRepoIntoWorld`-equivalent call) and may not automate selection —
  `INCLUDED` / `EXCLUDED` is a human decision only.
- `approval/` (R-4) is the only module allowed to perform the candidate →
  `Source` authority transition. No other module may create a `Source`.
- No new HTTP server or port — `routes/` mounts onto the existing `services`
  HTTP surface only.
- No direct `engine`/`data-center` RPC calls in Stage 1 — see the design
  doc §2/§9 for why, and the planned migration path.

## Contract

See [`CONTRACT.md`](CONTRACT.md) for the `DiscoveryApi` surface exposed to
APP and the internal R-3→R-2 seam.

## Status

Skeleton only — signatures and placeholder modules, no business logic (see
root [`README.md`](../../README.md#status)). Registered as `SVC-001` in
[`../PROCESSES.md`](../PROCESSES.md) / root [`REGISTRY.md`](../../REGISTRY.md).

## Internal layout

Per the design doc §3, organized into four internal modules mirroring the
handoff's logical responsibilities R-1 through R-4:

```
discovery/
├── source-access/   R-2 — inspectSourceCandidate(locator, kind)
├── discovery/        R-3 — DiscoveryRun, candidate evidence, identity grouping
├── approval/          R-4 — confirmSourceInventory, SourceInventory, receipts
└── routes/               R-1 extension — /api/discovery/* HTTP handlers
```

Real implementation begins at M1 (Source Access) per the design doc §11.
