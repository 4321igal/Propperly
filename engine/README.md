# Engine

The semantic core: reconstruction, understanding, conflicts, governance,
identity, dependencies, obligations. Runs as a separate process from
Services, reachable only via internal RPC.

## Not allowed to do

- Know about HTTP or MCP — it is not protocol-facing.
- Be called via direct import/function call from Services — RPC only.
- Interpret or own raw artifact storage — that's Storage's job (via Data
  Center references).
- Perform structured persistence itself — reads/writes go through Data
  Center.

## Contract

See [`CONTRACT.md`](CONTRACT.md) for the RPC interface Engine exposes to
Services.

## Processes

See [`PROCESSES.md`](PROCESSES.md) for Engine's internal sub-processes, each
with a fixed ID (pilot for the process-registry layer — see the root
[`REGISTRY.md`](../REGISTRY.md)).
