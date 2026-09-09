# Services — Processes

Sub-processes of the Services layer, following the process-registry pattern
piloted in [`engine/PROCESSES.md`](../engine/PROCESSES.md) (root
[organizational order proposal](../propperly_organizational_order_proposal_en.md),
section 9, stage 2).

Each ID below is also listed in the root [`REGISTRY.md`](../REGISTRY.md).

## SVC-001 — Discovery

Purpose: SL-02 Source Discovery — guided first-run source discovery and
approval, producing the Approved Source Inventory that gates reconstruction.
Requirements: see the
[Implementation Design](../propperly-engineering-handoffs/sl-02-source-discovery-software/IMPLEMENTATION_DESIGN_en.md).
Depends on: none in Stage 1 (self-contained inside `services`; see
Implementation Design §2/§9 for the planned `engine`/`data-center`
migration).
Status: planned — skeleton only (`CONTRACT.md` + placeholder modules under
[`discovery/`](discovery/README.md)), no business logic implemented.
