# Services

Use-case orchestration, authorization, and policy. Calls Engine (via internal
RPC) and Data Center/Storage. Exposes REST/GraphQL to APP and MCP.

## Not allowed to do

- Duplicate Engine's semantic rules (reconstruction, understanding, conflicts,
  governance, identity, dependencies, obligations).
- Call Engine via direct import/function call — must go through internal RPC,
  since Engine runs as a separate process.
- Write directly to Data Center/Storage in a way that bypasses Engine's
  semantic ownership of Living Understanding data.
- Expose HTTP/MCP protocol details to Engine — Engine knows nothing about
  HTTP/MCP.

## Contract

See [`CONTRACT.md`](CONTRACT.md) for the external interface exposed to APP
and MCP. The Engine RPC client stub lives at
[`src/engine-rpc-client.ts`](src/engine-rpc-client.ts).
