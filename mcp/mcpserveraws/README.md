# mcpserveraws

A real, runnable implementation of the MCP service's contract (see
[`../CONTRACT.md`](../CONTRACT.md), [`../README.md`](../README.md)), adapted
from [`../Prompt/McpServerAws.md`](../Prompt/McpServerAws.md).

That source doc is a generic "MCP server on AWS" guide whose example tools
call DynamoDB/S3 directly via the AWS SDK. This implementation keeps its
technical shell (MCP SDK server, dual stdio/HTTP transport, Dockerfile, AWS
deployment shapes) but drops the direct AWS data access, because MCP is only
ever allowed to call Services — never Data Center, Storage, or Engine
directly.

## Layout

- `src/index.ts` — MCP server bootstrap; picks stdio or HTTP transport from
  `MCP_MODE`.
- `src/services-client.ts` — `ServicesClient` stub (throws "not implemented"
  until Services exposes a real endpoint). Mirrors the stub pattern already
  used in `services/src/engine-rpc-client.ts`.
- `src/tools/services.ts` — tool registry entries. Currently one example
  tool, `services_ping`, routed only through `ServicesClient`. Every future
  tool must go through `ServicesClient` the same way, never around it.
- `src/auth/middleware.ts` — optional `x-mcp-api-key` header check for the
  HTTP listener.
- `deploy/` — AWS deployment artifacts (see [`deploy/README.md`](deploy/README.md)).

## Running

- `RunMcpServer.bat` (repo root, Windows) — installs deps, builds, and starts
  the HTTP transport on `http://localhost:3000`. Easiest way to run it
  locally.
- `npm run dev` — stdio transport, for local testing against an MCP client
  (e.g. Amazon Q Developer CLI, Claude Code). Uses `mcp.json` as the local
  client config.
- `npm run build && MCP_MODE=http npm start` — HTTP transport on `PORT`
  (default 3000), exposing `POST /mcp` and `GET /health`.

## Deployment

See [`deploy/README.md`](deploy/README.md) for AWS deployment options.
