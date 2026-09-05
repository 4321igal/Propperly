# MCP — External Contract

Signatures only. No implementation.

## Toward AI/Agent (JSON-RPC over stdio / HTTP+SSE)

```ts
interface ToolDefinition {
  name: string;
  description: string;
  // Real input/output schemas to be defined per tool.
  inputSchema: unknown;
}

interface ToolDispatcher {
  listTools(): ToolDefinition[];
  callTool(name: string, args: unknown): Promise<unknown>;
}
```

## Toward Services (consumed, not exposed — routes to Services only)

```ts
interface ServicesClient {
  ping(): Promise<{ status: string }>;
}
```
