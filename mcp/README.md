# MCP

AI-facing adapter. Speaks MCP protocol (JSON-RPC over stdio/HTTP+SSE) toward
AI/Agent clients. Holds a Tool Registry/Dispatcher that routes tool calls to
Services only.

## Not allowed to do

- Call Engine or Data Center directly — only Services.
- Write to canonical state directly — all writes go through Services.
- Duplicate Services' authorization/policy logic.

## Contract

See [`CONTRACT.md`](CONTRACT.md) for the tool registry shape and the
Services client interface MCP consumes. `src/index.ts` here is just the
skeleton placeholder.

## Reference implementation

[`mcpserveraws/`](mcpserveraws/README.md) is a real, runnable implementation
of this contract — MCP SDK server, stdio/HTTP transport, Docker image, and
AWS deployment options — adapted from
[`Prompt/McpServerAws.md`](Prompt/McpServerAws.md). It must still obey
everything above: it calls Services only, never Engine/Data Center/Storage
directly.
