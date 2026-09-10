# Services — External Contract

Signatures only. No implementation.

## Exposed to APP / MCP (REST)

```
GET  /health                                                → { status }

# Google OAuth  (rate-limited: 15 req/min)
GET  /oauth/google/authorize?user_id=<id>                  → redirect
GET  /oauth/google/callback?code=<code>                    → { token, userId, email }

# GitHub OAuth  (rate-limited: 15 req/min)
GET  /oauth/github/authorize?user_id=<id>                  → redirect
GET  /oauth/github/callback?code=<code>                    → { token, userId, githubLogin }

# Drive  (x-internal-key)
GET  /api/drive/files?userId=<id>&parentId=<id>            → DriveListResult
GET  /api/drive/files/:fileId/content?userId=<id>          → DriveReadResult
GET  /api/drive/search?userId=<id>&q=<query>               → DriveListResult

# Git  (x-internal-key)  — owner/repo/org validated via assertGitRef
GET  /api/git/repos?userId=<id>&org=<org>                  → { repos }
GET  /api/git/search?userId=<id>&q=<query>                 → { items, totalCount }
GET  /api/git/repos/:owner/:repo/pulls/:n/diff?userId      → { diff, title, state }
GET  /api/git/repos/:owner/:repo/commits?userId=<id>       → { commits }

# Local files — companion upload  (Bearer JWT, rate-limited: 300 req/min)
POST   /api/local/files                                    → { id }    max 10 MB, text only
DELETE /api/local/files?absolutePath=<path>                → 204

# Local files — MCP queries  (x-internal-key)
GET  /api/local/files?userId=<id>&folder=<prefix>          → { files }
GET  /api/local/files/:fileId/content?userId=<id>          → { content, mimeType, name }
GET  /api/local/search?userId=<id>&q=<query>               → { files }

# Sessions — companion upload  (Bearer JWT, rate-limited: 300 req/min)
POST /api/sessions                                         → { id }    max 55 KB content

# Sessions — MCP queries  (x-internal-key)
GET  /api/sessions/search?userId=<id>&q=<query>&limit=<n>  → { sessions }
GET  /api/sessions/activity?userId=<id>                    → { totalSessions, byTool, recentSessions }
```

## Security (Phase 5)

| Layer | Mechanism |
|-------|-----------|
| Security headers | `helmet` (X-Frame-Options, HSTS, XSS-Protection, etc.) |
| Global rate limit | 600 req/min per IP (`express-rate-limit`) |
| OAuth rate limit | 15 req/min per IP on `/oauth/*` |
| Upload rate limit | 300 req/min per IP on `/api/local/files`, `/api/sessions` |
| Path traversal | `assertSafePath`, `safeStoragePath`, `assertStorageKey` in `security/path-guard.ts` |
| Git ref injection | `assertGitRef` on all owner/repo/org params in `git/client.ts` |
| Input validation | `assertStringParam` on text fields; binary detection (null bytes) on uploads |
| Body size limit | 12 MB express.json() limit |
| Org allowlist | `GITHUB_ORG_ALLOWLIST` env var (comma-separated) |
| Internal routes | `x-internal-key` header required (when `INTERNAL_API_KEY` env set) |
| Multi-tenancy | Tenant model; `SINGLE_TENANT_ID` env for single-tenant deployments |

## Expected from Engine (internal RPC — consumed, not exposed)

See [`src/engine-rpc-client.ts`](src/engine-rpc-client.ts).
