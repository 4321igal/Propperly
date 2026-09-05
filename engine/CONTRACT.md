# Engine — External Contract

Signatures only. No implementation. This is the RPC surface Engine exposes
to Services (internal RPC — not HTTP/MCP facing).

```ts
interface EngineRpcServer {
  // Placeholder RPC method, mirrors services/src/engine-rpc-client.ts.
  // Real semantic operations (reconstruction, understanding, conflicts,
  // governance, identity, dependencies, obligations) to be defined later.
  ping(): Promise<{ status: string }>;
}
```
