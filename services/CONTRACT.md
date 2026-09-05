# Services — External Contract

Signatures only. No implementation.

## Exposed to APP / MCP (REST/GraphQL)

```ts
interface ServicesApi {
  // Placeholder use-case entry point. Real use-cases to be defined per
  // domain capability (identity, obligations, conflicts, etc.).
  ping(): Promise<{ status: string }>;
}
```

## Expected from Engine (internal RPC — consumed, not exposed)

See [`src/engine-rpc-client.ts`](src/engine-rpc-client.ts) for the stub
client shape Services uses to call Engine.
