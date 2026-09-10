# Propperly

Propperly is an organizational MCP (Model Context Protocol) server that gives AI agents — Claude, Cursor, VS Code, and others — authenticated, audited access to a team's knowledge sources: Google Drive, GitHub, local files, and AI session logs.

## Architecture

```
AI Agent (Claude Desktop / Claude Code / Cursor)
       │
       │  MCP  (JSON-RPC over HTTP or stdio)
       ▼
┌─────────────────────────────────────────────────────┐
│  MCP Server  (mcp/mcpserveraws/)                    │
│  Tools: Drive · Git · Local · Sessions · Ping       │
│  Auth: JWT Bearer middleware                        │
└──────────────────────────┬──────────────────────────┘
                           │  Internal REST  (x-internal-key)
                           ▼
┌─────────────────────────────────────────────────────┐
│  Services  (services/src/index.ts)  port 3001       │
│  ├── /oauth/google/*   — Google Drive OAuth flow    │
│  ├── /oauth/github/*   — GitHub OAuth flow          │
│  ├── /api/drive/*      — Google Drive files         │
│  ├── /api/git/*        — GitHub repos, code, PRs    │
│  ├── /api/local/*      — companion-synced files     │
│  ├── /api/sessions/*   — AI session logs            │
│  ├── /api/discovery/*  — source inventory (SL-02)   │
│  └── /health           — liveness check             │
│                                                     │
│  Storage: PostgreSQL (Prisma) + local ./uploads     │
└──────────────────────────┬──────────────────────────┘
                           │  uploads
                           ▼
┌─────────────────────────────────────────────────────┐
│  Companion Agent  (services/companion/)             │
│  Runs on the user's machine.                        │
│  • Watches whitelisted local folders (chokidar)     │
│  • Scans AI session dirs (~/.claude/projects/ etc.) │
│  • Redacts secrets before upload                    │
│  • POSTs to /api/local/files and /api/sessions      │
└─────────────────────────────────────────────────────┘
```

## MCP Tools

| Tool | Adapter | Description |
|---|---|---|
| `list_drive_files` | Drive | List files/folders in Google Drive |
| `read_drive_file` | Drive | Read a Drive file by ID |
| `search_drive` | Drive | Full-text search across Drive |
| `list_repos` | Git | List GitHub repos (by user or org) |
| `search_code` | Git | Code search across GitHub |
| `get_pr_diff` | Git | Unified diff of a pull request |
| `get_commit_history` | Git | Commit log for a branch |
| `list_local_files` | Local | List companion-synced files |
| `read_local_file` | Local | Read a synced local file by ID |
| `search_local_files` | Local | Search synced files by name/path |
| `search_sessions` | Sessions | Search AI session logs |
| `get_recent_activity` | Sessions | Summary of recent AI tool usage |
| `services_ping` | Core | Health-check the Services layer |

## Auth Flow

Each adapter has its own OAuth flow. The user authenticates once and receives a JWT:

```
1. Open browser → GET /oauth/google/authorize   (or /oauth/github/authorize)
2. Complete consent → Services exchanges code → issues JWT
3. Add JWT to AI client config:
   "headers": { "Authorization": "Bearer <token>" }
4. MCP server validates JWT on every request, scopes data to that user
```

## Running Locally

**Prerequisites:** Node 20+, PostgreSQL 15+.

### 1. Services

```bash
cd services
cp .env.example .env   # fill in DB_URL, OAuth credentials, JWT_SECRET
npx prisma db push
npm start              # listens on :3001
```

### 2. MCP Server

```bash
cd mcp/mcpserveraws
npm install
# HTTP mode (for multi-user / Claude Desktop)
$env:MCP_MODE="http"; $env:SERVICES_URL="http://localhost:3001"; npm start
# Stdio mode (for local dev / Claude Code)
npm run dev
```

### 3. Companion Agent

```bash
cd services/companion
npm install
npm run setup          # interactive: server URL, bearer token, folders to watch
npm start              # syncs sessions, then watches for changes
```

## Security

- **Transport auth:** JWT Bearer on all MCP HTTP endpoints; `x-internal-key` for Services-internal calls.
- **Secret redaction:** Companion strips AWS keys, GitHub tokens, OpenAI keys, Anthropic keys, JWTs, and labelled secrets before uploading any file.
- **Path traversal guard:** `services/security/path-guard.ts` validates all file paths before storage or retrieval.
- **Rate limiting:** `express-rate-limit` applied globally and tighter limits on OAuth and upload endpoints.
- **Input validation:** All uploads capped at 10 MB; binary content (null bytes) rejected; session content capped at 50 KB.
- **Audit log:** Every MCP tool call is written to `ToolCall` table (userId, tool, args, result summary, duration).

## Tech Stack

| Layer | Technology |
|---|---|
| MCP protocol | `@modelcontextprotocol/sdk` (TypeScript) |
| HTTP framework | Express 4 |
| Auth | `jose` (JWT), Google OAuth 2.0, GitHub OAuth |
| GitHub API | `@octokit/rest` |
| Google Drive | `googleapis` |
| Database | PostgreSQL + Prisma |
| File watching | chokidar 3 |
| Runtime | Node 20, TypeScript 5, tsx |

## Project Layout

```
mcp/
  mcpserveraws/          # MCP server — all tool adapters
    src/
      index.ts           # HTTP + stdio entry point
      services-client.ts # typed client for the Services REST API
      auth/middleware.ts # JWT Bearer + API-key fallback
      tools/
        drive.ts         # Google Drive tools
        git.ts           # GitHub tools
        local.ts         # companion-synced file tools
        sessions.ts      # AI session log tools
        services.ts      # services_ping

services/
  src/index.ts           # Express app entry — wires all routes
  drive/                 # Google Drive OAuth + API client + routes
  git/                   # GitHub OAuth + Octokit client + routes
  local/                 # companion upload/read routes + Prisma ops + disk storage
  sessions/              # session upload/search routes + Prisma ops
  discovery/             # SL-02 source inventory (workspace, runs, approval)
  auth/jwt.ts            # JWT issue helper
  audit/index.ts         # tool-call audit logger
  db/client.ts           # Prisma singleton
  security/
    path-guard.ts        # path traversal + storage-key validation
    rate-limit.ts        # express-rate-limit presets
  public/index.html      # Source Discovery browser UI
  companion/             # standalone companion agent
    src/
      index.ts           # entry: --setup wizard or run loop
      config.ts          # ~/.propperly/companion.json
      upload.ts          # HTTP client → Services
      secrets.ts         # regex secret redaction
      local-sync.ts      # chokidar folder watcher
      session-sync.ts    # AI session file discovery + upload
```
