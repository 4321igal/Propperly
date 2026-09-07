# How to Use the Propperly MCP Server in Claude Desktop

## Prerequisites

- Claude Desktop installed (download from https://claude.ai/download)
- Node.js 20+ installed
- This repo cloned locally

---

## Step 1: Build the MCP Server

```bash
cd mcp/mcpserveraws
npm install
npm run build
```

Verify the build succeeded — `dist/index.js` should exist.

---

## Step 2: Find the Claude Desktop Config File

| OS      | Path                                                              |
|---------|-------------------------------------------------------------------|
| Windows | `%APPDATA%\Claude\claude_desktop_config.json`                     |
| macOS   | `~/Library/Application Support/Claude/claude_desktop_config.json` |

If the file doesn't exist yet, create it.

---

## Step 3: Add the MCP Server Entry

Open `claude_desktop_config.json` and add (or merge) the following:

```json
{
  "mcpServers": {
    "propperly-mcp": {
      "command": "node",
      "args": ["C:/programming/Propperly/mcp/mcpserveraws/dist/index.js"],
      "env": {
        "MCP_MODE": "stdio"
      }
    }
  }
}
```

> **Windows path note**: use forward slashes (`/`) or escaped back-slashes (`\\`) in the JSON.
> Replace `C:/programming/Propperly` with the actual path where you cloned the repo.

---

## Step 4: Restart Claude Desktop

Fully quit Claude Desktop (system tray → Quit, not just close the window) and reopen it.

---

## Step 5: Verify the Server is Connected

1. Start a new conversation in Claude Desktop.
2. Click the **tools icon** (hammer/wrench) in the bottom-left of the input area.
3. You should see **propperly-mcp** listed with its tools (e.g. `services_ping`).

If the server does not appear, check:
- The path in `args` is correct and `dist/index.js` exists.
- Node.js is on your system `PATH` (run `node --version` in a terminal to confirm).
- Claude Desktop logs: **Help → Open Logs Folder** → look at `mcp-server-propperly-mcp.log`.

---

## Available Tools (current)

| Tool            | Description                                                   |
|-----------------|---------------------------------------------------------------|
| `services_ping` | Health-check ping routed through ServicesClient               |

More tools will be added as the Services layer exposes endpoints.

---

## Troubleshooting

**`spawn node ENOENT`** — Node.js is not on the PATH that Claude Desktop sees.
Fix: use the full path to `node.exe` in `command`, e.g.:
```json
"command": "C:/Program Files/nodejs/node.exe"
```

**Server connects but tools are missing** — the build may be stale. Re-run `npm run build`.

**`ServicesClient not implemented` errors** — expected until the Services layer is live; the tool call reaches the MCP server but the downstream service stub throws. This is not a Claude Desktop configuration issue.

---

## Running Locally for Development (without Claude Desktop)

Use the Amazon Q Developer CLI or Claude Code itself:

```bash
# stdio mode — for MCP clients that spawn the process
npm run dev

# HTTP mode — exposes POST /mcp on http://localhost:3000
npm run build && MCP_MODE=http npm start
```

For Claude Code, add the server to your project's `.claude/settings.json`:

```json
{
  "mcpServers": {
    "propperly-mcp": {
      "command": "node",
      "args": ["./mcp/mcpserveraws/dist/index.js"],
      "env": { "MCP_MODE": "stdio" }
    }
  }
}
```
