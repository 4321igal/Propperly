# AWS MCP Server Tutorial

Tutorial for `propperly-mcp` (`mcp/mcpserveraws/`) — the reference MCP server
implementation for this project. See [`README.md`](README.md) and
[`../CONTRACT.md`](../CONTRACT.md) for the full contract.

## What it is

`propperly-mcp` is the AI-facing adapter in the six-service architecture. It
speaks MCP (JSON-RPC over stdio or HTTP) to AI/agent clients and dispatches
tool calls **only** to the Services layer — it is not allowed to touch
Engine, Data Center, or Storage directly, and it must not duplicate Services'
auth/policy logic.

It currently exposes one tool, `services_ping`, wired through a
`ServicesClient` stub that throws `"not implemented"` until Services exposes
a real endpoint (`src/services-client.ts`).

## How to run it

**Easiest (Windows, HTTP mode):**
```
RunMcpServer.bat
```
Installs deps, builds the `@propperly/mcp-server-aws` workspace, and starts
it on `http://localhost:3000` (health check at `/health`).

**Manual, HTTP mode:**
```bash
npm install
npm run build --workspace=@propperly/mcp-server-aws
MCP_MODE=http npm start --workspace=@propperly/mcp-server-aws
```
PowerShell: `$env:MCP_MODE="http"; npm start --workspace=@propperly/mcp-server-aws`

**Stdio mode** (for local testing directly against an MCP client, no HTTP):
```bash
cd mcp/mcpserveraws
npm run dev
```

Env vars:
- `MCP_MODE` — `stdio` (default) or `http`
- `PORT` — HTTP port, default `3000`
- `MCP_API_KEY` — optional; if set, HTTP requests to `/mcp` must send header
  `x-mcp-api-key: <value>` or get `401` (`src/auth/middleware.ts`). If unset,
  no auth is enforced (dev default).

## How to use it inside (connect a client and call a tool)

**Option A — stdio, via `mcp.json`:**

`mcp.json` in this directory already defines the server for stdio clients
(Amazon Q Developer CLI, Claude Code, etc.):
```json
{
  "mcpServers": {
    "propperly-mcp": {
      "command": "node",
      "args": ["./dist/index.js"],
      "env": { "MCP_MODE": "stdio" }
    }
  }
}
```
Build first (`npm run build --workspace=@propperly/mcp-server-aws`), then
point your MCP client at this `mcp.json` (or copy the entry into the
client's own config). The client will list `services_ping` as an available
tool and can invoke it.

**Option B — HTTP, direct call for testing:**

With the server running in HTTP mode:
```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "x-mcp-api-key: <value if MCP_API_KEY is set>" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"services_ping","arguments":{}}}'
```
Expect `{"status": "..."}` once Services is implemented, or right now an
error result (`"Error: not implemented"`) since `ServicesClient.ping()` is
still a stub.

Health check: `curl http://localhost:3000/health` → `{"status":"ok"}`.

## Adding a new tool

Register it in `src/tools/services.ts` via
`server.tool(name, description, schema, handler)`, and make the handler
call a method on `ServicesClient` (`src/services-client.ts`) — never call
another service directly. That is the one hard rule this layer enforces.
