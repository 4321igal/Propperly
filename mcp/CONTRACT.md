# MCP — External Contract

Signatures only. No implementation.

## Toward AI/Agent (JSON-RPC over stdio / HTTP+SSE)

### Registered tools

| Tool | Description | Auth |
|------|-------------|------|
| `services_ping` | Check Services reachability | none |
| `list_drive_files` | List files in Google Drive | Google JWT |
| `read_drive_file` | Read text content of a Drive file | Google JWT |
| `search_drive` | Full-text search across Drive | Google JWT |
| `list_repos` | List GitHub repositories | GitHub JWT |
| `search_code` | Search code across repos/org | GitHub JWT |
| `get_pr_diff` | Get unified diff of a PR | GitHub JWT |
| `get_commit_history` | Get commit log for a branch | GitHub JWT |
| `list_local_files` | List files synced by companion agent | any JWT |
| `read_local_file` | Read content of a synced local file | any JWT |
| `search_local_files` | Search synced files by name/path | any JWT |
| `search_sessions` | Search AI session logs (Claude/Cursor/VSCode) | any JWT |
| `get_recent_activity` | Summary of recent session activity by tool | any JWT |

## Toward Services (consumed, not exposed)

```ts
interface ServicesClient {
  userId: string | undefined;
  ping(): Promise<{ status: string }>;
  drive:    { listFiles / readFile / searchFiles };
  git:      { listRepos / searchCode / getPrDiff / getCommitHistory };
  local:    { listFiles / readFile / searchFiles };
  sessions: { search / getActivity };
}
```

## Auth

HTTP mode: `Authorization: Bearer <jwt>` — issued by Services after OAuth  
Fallback: `x-mcp-api-key` (no user context — all data tools will reject).

## Security constraints (Phase 5)

- MCP never calls Engine, Data Center, Storage, or external APIs directly — only Services
- All HTTP requests to Services include `x-internal-key` from `INTERNAL_API_KEY` env
- Per-request McpServer instances: user context (JWT sub) is scoped to each HTTP request
- No global mutable state for user identity
