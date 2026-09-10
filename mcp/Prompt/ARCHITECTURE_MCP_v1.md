# Architecture Document — MCP Organizational Server
**Propperly / McpServerAws — Phases 1–5**
_Generated: 2026-09-10_

---

## 1. File Tree by Layer

```
Propperly/                                    ← monorepo root
│
├── docker-compose.yml                        ← Infrastructure: PostgreSQL 16-alpine (dev)
│
├── REGISTRY.md                               ← Process registry (source of truth for process IDs)
├── README.md                                 ← System map
├── package.json                              ← npm workspaces root
│
├── ── LAYER: SERVICES (SVC) ──────────────────────────────────────────
│
├── services/
│   ├── package.json                          ← deps: express, helmet, express-rate-limit,
│   │                                              googleapis, @octokit/rest, jose,
│   │                                              @prisma/client, prisma
│   ├── tsconfig.json
│   ├── CONTRACT.md                           ← All exposed REST endpoints + security table
│   │
│   ├── src/
│   │   ├── index.ts                          ← Express entry: helmet, rate limiters, all routes
│   │   └── engine-rpc-client.ts             ← ENGINE RPC stub (placeholder, not implemented)
│   │
│   ├── prisma/
│   │   └── schema.prisma                    ← Models: Tenant, UserToken, GitHubToken,
│   │                                              Session, LocalFile, AuditLog
│   ├── db/
│   │   └── client.ts                        ← PrismaClient singleton
│   │
│   ├── auth/
│   │   └── jwt.ts                           ← signJwt() using jose (HS256, 30d expiry)
│   │
│   ├── audit/
│   │   └── index.ts                         ← logToolCall() → AuditLog table
│   │
│   ├── security/                            ← Phase 5
│   │   ├── path-guard.ts                   ← safeStoragePath, assertSafePath,
│   │   │                                        assertGitRef, assertStringParam
│   │   └── rate-limit.ts                   ← oauthLimiter(15/min), uploadLimiter(300/min),
│   │                                              globalLimiter(600/min)
│   ├── tenant/                              ← Phase 5
│   │   └── db.ts                           ← findOrCreateTenant, resolveTenantId()
│   │
│   ├── drive/                              ← Phase 1
│   │   ├── oauth.ts                        ← Google OAuth2 flow + issueJwt
│   │   ├── client.ts                       ← listFiles, readFile, searchFiles (googleapis)
│   │   └── routes/index.ts                ← GET /oauth/google/*, GET /api/drive/*
│   │
│   ├── git/                               ← Phase 2
│   │   ├── oauth.ts                       ← GitHub OAuth flow + issueGitHubJwt
│   │   ├── client.ts                      ← listRepos, searchCode, getPrDiff,
│   │   │                                       getCommitHistory (@octokit/rest)
│   │   │                                       + assertGitRef + org allowlist
│   │   └── routes/index.ts               ← GET /oauth/github/*, GET /api/git/*
│   │
│   ├── local/                            ← Phase 3
│   │   ├── storage.ts                    ← storeContent/readContent/removeContent
│   │   │                                     (disk: UPLOADS_DIR, swappable to S3)
│   │   ├── db.ts                         ← upsertLocalFile, deleteLocalFile,
│   │   │                                     listLocalFiles, searchLocalFiles
│   │   └── routes/index.ts              ← POST/DELETE/GET /api/local/*
│   │
│   ├── sessions/                        ← Phase 4
│   │   ├── db.ts                        ← upsertSession, searchSessions, getRecentActivity
│   │   └── routes/index.ts             ← POST /api/sessions, GET /api/sessions/*
│   │
│   └── discovery/                      ← SVC-001 (pre-existing, SL-02 slice)
│       ├── CONTRACT.md
│       ├── source-access/index.ts
│       ├── discovery/                  ← orchestrator, policy, identity, projection
│       ├── approval/
│       └── routes/index.ts
│
├── ── LAYER: MCP ─────────────────────────────────────────────────────
│
├── mcp/
│   ├── package.json
│   ├── CONTRACT.md                         ← Registered tools + ServicesClient interface
│   ├── src/index.ts                        ← Legacy placeholder (not the active server)
│   │
│   └── mcpserveraws/                       ← Active MCP implementation
│       ├── package.json                    ← deps: @modelcontextprotocol/sdk, express, jose, zod
│       ├── tsconfig.json
│       ├── mcp.json                        ← Claude Desktop config
│       │
│       └── src/
│           ├── index.ts                    ← Entry: HTTP mode (per-request McpServer)
│           │                                   + stdio mode (dev/Claude Code)
│           ├── services-client.ts          ← ServicesClient factory + all TypeScript interfaces
│           │
│           ├── auth/
│           │   └── middleware.ts           ← authMiddleware: Bearer JWT → req.user
│           │                                   fallback: x-mcp-api-key
│           └── tools/
│               ├── services.ts             ← services_ping tool
│               ├── drive.ts               ← list_drive_files, read_drive_file, search_drive
│               ├── git.ts                 ← list_repos, search_code, get_pr_diff,
│               │                               get_commit_history
│               ├── local.ts              ← list_local_files, read_local_file,
│               │                               search_local_files
│               └── sessions.ts           ← search_sessions, get_recent_activity
│
├── ── LAYER: COMPANION AGENT ─────────────────────────────────────────
│
├── companion/
│   ├── package.json                        ← deps: chokidar; scripts: pkg binaries (win/mac/linux)
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts                        ← Entry: scan + sessions + watch
│       ├── config.ts                       ← Config loader (servicesUrl, jwt, folders)
│       ├── scanner.ts                      ← Initial full scan + upload
│       ├── watcher.ts                      ← chokidar incremental watcher
│       ├── uploader.ts                     ← HTTP upload to Services (Bearer JWT)
│       ├── utils.ts                        ← detectMimeType (shared)
│       ├── secrets-filter.ts              ← 9-pattern secrets scrubber (Phase 4)
│       └── session-scanner.ts            ← Claude/Cursor/VSCode session log scanner (Phase 4)
│                                               + SessionCache dedup at ~/.propperly/
│
├── ── LAYER: PROJECT SKELETON (pre-existing) ─────────────────────────
│
├── app/            ← UI layer (skeleton only)
├── engine/         ← Semantic engine (skeleton + ENGINE RPC stub target)
├── data-center/    ← Structured persistence (skeleton + workspace/inventory stores)
├── storage/        ← Object storage (skeleton)
└── web/            ← Web frontend (skeleton)
```

---

## 2. Communication Protocol

### 2.1 Protocol per interface

| Interface | Protocol | Auth | Direction |
|-----------|----------|------|-----------|
| AI/Agent → MCP (HTTP) | JSON-RPC 2.0 over HTTP+SSE (Streamable HTTP) | `Authorization: Bearer <jwt>` | inbound |
| AI/Agent → MCP (stdio) | JSON-RPC 2.0 over stdin/stdout | `USER_ID` env var | inbound |
| MCP → Services | REST/HTTP (`fetch`) | `x-internal-key` header | outbound |
| Companion → Services | REST/HTTP (`fetch`) | `Authorization: Bearer <jwt>` | outbound |
| Services → Google Drive | HTTPS (googleapis SDK) | per-user OAuth2 access token | outbound |
| Services → GitHub | HTTPS (@octokit/rest) | per-user GitHub PAT | outbound |
| Services → PostgreSQL | TCP Prisma ORM | `DATABASE_URL` env | outbound |
| Services → Engine | Internal RPC (stub — not implemented) | — | outbound |

### 2.2 JWT Flow

```
User                 Services                 MCP                   AI
 │                      │                      │                     │
 │  GET /oauth/google/  │                      │                     │
 │  authorize?user_id=X │                      │                     │
 │─────────────────────►│                      │                     │
 │  redirect → Google   │                      │                     │
 │◄─────────────────────│                      │                     │
 │                      │                      │                     │
 │  GET /oauth/google/  │                      │                     │
 │  callback?code=Y     │                      │                     │
 │─────────────────────►│                      │                     │
 │                      │ store token in DB    │                     │
 │  { token: jwt }      │ signJwt(userId)      │                     │
 │◄─────────────────────│                      │                     │
 │                      │                      │                     │
 │                               Authorization: Bearer <jwt>         │
 │──────────────────────────────────────────────────────────────────►│
 │                               jwtVerify → userId                  │
 │                               createServicesClient(userId)        │
 │                               x-internal-key → Services           │
 │                               ──────────────►│                    │
 │                               response       │                    │
 │                               ◄──────────────│                    │
```

### 2.3 Companion Upload Flow

```
User Machine                              Services                   PostgreSQL
┌─────────────────────────────┐           │                          │
│ companion/src/scanner.ts    │           │                          │
│  1. Walk whitelisted folders│           │                          │
│  2. isSensitiveFile() check │           │                          │
│  3. filterSecrets() scrub   │           │                          │
│  4. base64 encode content   │           │                          │
│  5. POST /api/local/files   │──────────►│                          │
│     Bearer JWT              │           │ assertSafePath()         │
│                             │           │ binary detection         │
│                             │           │ storeContent(disk)       │
│                             │           │ upsertLocalFile──────────►
│                             │           │                          │
│ companion/src/watcher.ts   │           │                          │
│  chokidar add/change/unlink │──────────►│ incremental updates      │
│                             │           │                          │
│ session-scanner.ts          │           │                          │
│  detect Claude/Cursor/VSCode│           │                          │
│  JSONL/log files            │           │                          │
│  filterSecrets() scrub      │           │                          │
│  POST /api/sessions         │──────────►│ upsertSession ───────────►
└─────────────────────────────┘           │                          │
```

### 2.4 Rate Limiting Stack (per IP)

```
All requests → globalLimiter (600/min)
  /oauth/*   → oauthLimiter  (15/min  — tighter, public)
  /api/local/files → uploadLimiter (300/min — companion)
  /api/sessions    → uploadLimiter (300/min — companion)
```

---

## 3. High-Level Design

### 3.1 System Map

```
                        ┌─────────────────────────────────────────┐
                        │               AI / Agent                │
                        │  (Claude Desktop, Claude Code, Cursor)  │
                        └────────────────┬────────────────────────┘
                                         │ JSON-RPC 2.0
                                         │ (stdio or HTTP+SSE)
                        ┌────────────────▼────────────────────────┐
                        │            MCP Server                   │
                        │    mcp/mcpserveraws/src/index.ts        │
                        │                                         │
                        │  tools: ping | drive | git | local      │
                        │          sessions                       │
                        │                                         │
                        │  Auth: JWT → userId                     │
                        │  Client: ServicesClient(userId)         │
                        └────────────────┬────────────────────────┘
                                         │ REST (x-internal-key)
                   ┌─────────────────────▼─────────────────────────┐
                   │                  Services                      │
                   │          services/src/index.ts                 │
                   │                                                │
                   │  helmet  │  rate limits  │  express.json 12mb │
                   │                                                │
                   │  ┌──────────┐  ┌────────┐  ┌───────────────┐ │
                   │  │  Drive   │  │  Git   │  │  Local Files  │ │
                   │  │ adapter  │  │adapter │  │   adapter     │ │
                   │  └────┬─────┘  └───┬────┘  └──────┬────────┘ │
                   │       │            │               │          │
                   │  ┌────▼─────┐  ┌──▼─────┐  ┌─────▼───────┐  │
                   │  │ Google   │  │ GitHub │  │  Disk/S3    │  │
                   │  │  Drive   │  │   API  │  │ (UPLOADS_DIR│  │
                   │  │   API    │  │        │  │             │  │
                   │  └──────────┘  └────────┘  └─────────────┘  │
                   │                                                │
                   │  ┌────────────────────────────────────────┐   │
                   │  │           PostgreSQL (Prisma)          │   │
                   │  │  Tenant | UserToken | GitHubToken      │   │
                   │  │  Session | LocalFile | AuditLog        │   │
                   │  └────────────────────────────────────────┘   │
                   └────────────────────────────────────────────────┘
                                         ▲
                                         │ REST (Bearer JWT)
                   ┌─────────────────────┴─────────────────────────┐
                   │           Companion Agent (user machine)       │
                   │                                                │
                   │  scanner.ts  →  filterSecrets()  →  upload    │
                   │  watcher.ts  (chokidar) incremental sync       │
                   │  session-scanner.ts  →  Claude/Cursor/VSCode   │
                   └────────────────────────────────────────────────┘
```

### 3.2 Data Flow: MCP tool call (example: read_drive_file)

```
1.  AI calls tool "read_drive_file" with { fileId: "abc" }
2.  MCP authMiddleware validates Bearer JWT → extracts userId
3.  createServicesClient(userId) is created (per-request, no global state)
4.  services.drive.readFile("abc")
    → GET http://services:3001/api/drive/files/abc/content?userId=<id>
    → header: x-internal-key: <key>
5.  Services looks up UserToken[userId].accessToken from PostgreSQL
6.  googleapis calls drive.files.export() or drive.files.get()
7.  logToolCall() writes AuditLog row
8.  JSON response returns to MCP
9.  MCP returns { content: [{ type: 'text', text: <content> }] } to AI
```

### 3.3 Secrets Lifecycle (Companion)

```
File on disk
    ↓  isSensitiveFile()   → block .env, credentials.json, id_rsa etc.
    ↓  filterSecrets()     → redact 9 patterns (Anthropic, OpenAI, AWS, GitHub, JWT, PEM, etc.)
    ↓  binary detection    → reject null bytes in first 4KB (Services-side double check)
    ↓  size check          → max 10MB files, max 55KB sessions
    ↓  upload to Services
    ↓  stored to disk (UPLOADS_DIR)
```

### 3.4 Security Layers (Phase 5)

| Layer | Where | Mechanism |
|-------|-------|-----------|
| Security headers | MCP entry | `helmet()` |
| Rate limiting | MCP entry | `express-rate-limit` (3 tiers) |
| JWT validation | MCP auth | `jwtVerify` (jose, HS256) |
| Internal key | Services routes | `x-internal-key` header |
| Path traversal | Services local/sessions | `assertSafePath`, `safeStoragePath` |
| Git injection | Services git client | `assertGitRef` on owner/repo/org |
| Input validation | Services routes | `assertStringParam` |
| Binary rejection | Services local routes | null-byte scan in first 4KB |
| Secrets scrub | Companion (pre-upload) | 9 regex patterns |
| Org allowlist | Services git client | `GITHUB_ORG_ALLOWLIST` env |
| Multi-tenancy | Services oauth + tenant | `Tenant` model, `resolveTenantId()` |

---

## 4. Conflict Check

### 4.1 Confirmed conflicts / bugs

#### CONFLICT-01 — MCP stdio mode registers only 2 of 5 tool sets
**File:** `mcp/mcpserveraws/src/index.ts` lines 48–56

```ts
// ❌ Current stdio mode:
registerServicesTools(server, services);
registerDriveTools(server, services);
// Missing: registerGitTools, registerLocalTools, registerSessionTools
```

HTTP mode correctly registers all 5. Stdio mode (used for Claude Code / local dev) is missing Git, Local, and Sessions tools. **Impact:** Claude Code users cannot use git/local/session tools when running via stdio.

**Fix:** Add the 3 missing registrations to the stdio branch in `mcp/mcpserveraws/src/index.ts`.

---

#### CONFLICT-02 — `mcp/src/index.ts` is a dead placeholder
**File:** `mcp/src/index.ts`

This file exists at `mcp/src/index.ts` (the workspace root package entry point) and contains only `console.log("service MCP is up")`. The actual implementation is in `mcp/mcpserveraws/src/index.ts`. The two packages coexist in the same workspace with overlapping purpose. This creates confusion about which is the canonical MCP entry point.

**Recommendation:** Mark `mcp/src/index.ts` explicitly as a legacy placeholder or consolidate into one package.

---

#### CONFLICT-03 — REGISTRY.md not updated for Phases 1–5
The registry tracks `SVC-001 Discovery` but has no entries for:
- MCP sub-adapters: Drive adapter, Git adapter, Local adapter, Sessions adapter
- Companion agent process (not in the 6-service architecture at all)

Per the REGISTRY.md rule: _"no new sub-process/module is added without first adding a row here"_.

**Recommendation:** Add registry entries for the new sub-processes after deciding their IDs.

---

#### CONFLICT-04 — `services/git/oauth.ts` uses `mcp/mcpserveraws/` git tools but they register on different auth paths
The git OAuth callback returns `{ token, userId, githubLogin }` which is correct. But the `issueGitHubJwt()` function creates a JWT with `sub=userId`. MCP's `authMiddleware` extracts `payload.sub` as `userId`. This is consistent — no actual bug, but the userId for GitHub is the same namespace as Google Drive's userId. If a user authenticates with both, the same userId references two separate token rows (UserToken + GitHubToken). This is intentional by design.

**No action needed, but worth documenting.**

---

### 4.2 Minor issues / warnings

| # | File | Issue | Severity |
|---|------|-------|----------|
| W-01 | `services/local/storage.ts` | `dest.lastIndexOf('/')` uses forward slash — breaks on Windows if `resolve()` returns backslashes. Should use `path.dirname()`. | Medium |
| W-02 | `services/discovery/routes/index.ts` | Imports directly from `data-center/src/` and `app/src/` — crosses service layer boundary via TypeScript imports instead of REST/RPC. Acceptable for current stage but violates separation. | Low |
| W-03 | `companion/src/session-scanner.ts` | Session cache is at `~/.propperly/session-cache.json`. On Windows, `~` may not resolve correctly in all shells. Should use `os.homedir()` explicitly. | Low (likely already handled) |
| W-04 | `services/src/index.ts` | `app.use('/api/local/files', uploadLimiter)` and `app.use('/api/sessions', uploadLimiter)` are declared after `registerDiscoveryRoutes` and before `registerLocalRoutes`. In Express, `app.use()` middleware applies only to routes registered AFTER it in the same stack. The order here is correct (limiters registered before the route handlers). | OK — confirmed correct |
| W-05 | `services/git/routes/index.ts` | `oauthLimiter` is applied at the app level via `app.use('/oauth', oauthLimiter)` in `src/index.ts`, registered BEFORE `registerGitRoutes` and `registerDriveRoutes`. Discovery has no `/oauth` routes so there is no bypass. | OK — confirmed correct |

---

## 5. Alignment with Project Architecture

### 5.1 Original architecture (from `propperly_initial_project_prompt_en.md`)

The project defines **6 services** with strict responsibility boundaries:

| Service | Original responsibility |
|---------|------------------------|
| APP | UI — no semantic logic |
| **Services** | Use-case orchestration, auth, policy. **Calls Engine/Data Center/Storage** |
| ENGINE | Semantic core — separate process, internal RPC only |
| DATA CENTER | Structured persistence |
| STORAGE | Raw artifact storage (S3-compatible) |
| **MCP** | AI adapter — calls Services only, never Engine/DC/Storage directly |

### 5.2 What was implemented vs. what architecture expects

#### ✅ Aligned

| Rule | Status |
|------|--------|
| MCP never calls Engine, Data Center, Storage, or external APIs directly | ✅ All data goes through `ServicesClient` → Services REST |
| MCP authentication is Bearer JWT issued by Services | ✅ Implemented in `auth/middleware.ts` |
| Per-request McpServer instance (no shared user state) | ✅ Implemented in HTTP mode |
| Audit logging on all tool calls | ✅ `logToolCall()` in every route handler |
| ENGINE connection is a stub/RPC placeholder | ✅ `services/src/engine-rpc-client.ts` exists as stub |
| MCP is a separate workspace from Services | ✅ `mcp/mcpserveraws/` is a separate npm workspace |

#### ⚠️ Partial alignment / deviations

| Rule | Status | Notes |
|------|--------|-------|
| Services calls Engine/Data Center/Storage — not external APIs | ⚠️ **Deviation** | Services calls Google Drive + GitHub APIs directly. The original architecture implies these should go through Engine or another adapter layer. **Justified by MCP plan (`McpServerAws_v1.md`)** which explicitly designates Services as the adapter host. This is an intentional architectural decision for this feature. |
| STORAGE is a separate service for raw artifacts | ⚠️ **Deviation** | Local files are stored at `UPLOADS_DIR` on the Services server disk. The `storage/` package (skeleton) is not used. The code comment in `local/storage.ts` acknowledges this: _"Phase 5+ can swap in an S3 driver"_. Acceptable for MVP but not production-ready. |
| Services only calls Engine/Data Center/Storage | ⚠️ **Deviation** | `services/discovery/routes/index.ts` directly imports from `data-center/src/` via TypeScript imports. This is a build-time coupling, not a runtime RPC call. Acceptable for current stage (single process) but violates the separation intent. |

#### ❌ Not yet aligned

| Rule | Status | Notes |
|------|--------|-------|
| Companion agent not in project architecture | ❌ **Gap** | Companion is an additional process not defined in the 6-service architecture. It runs on the user's machine and has no registry entry. The architecture should be extended to include it as an auxiliary process (outside the 6 server-side services). |
| REGISTRY.md out of date | ❌ **Gap** | New sub-processes from Phases 1–5 have no registry entries. |

### 5.3 Summary assessment

The implementation is **well-aligned with the MCP plan** (`McpServerAws_v1.md`) and follows all its explicit constraints. The deviations from the original 6-service architecture are **intentional and documented** — the MCP plan effectively extends the architecture to add Drive/Git as Services-level adapters. The main gaps are **operational** (REGISTRY not updated, local storage not using the STORAGE layer) rather than structural violations.

---

## 6. Required Actions (Priority Order)

| Priority | Action | File | Impact |
|----------|--------|------|--------|
| 🔴 HIGH | Fix stdio mode — add missing tool registrations | `mcp/mcpserveraws/src/index.ts` | Claude Code users can't access Git/Local/Sessions |
| 🟡 MED | Fix `path.dirname()` instead of `lastIndexOf('/')` | `services/local/storage.ts` | Windows path bug |
| 🟡 MED | Update REGISTRY.md with new sub-processes | `REGISTRY.md` | Registry rule violation |
| 🟢 LOW | Clarify `mcp/src/index.ts` placeholder status | `mcp/src/index.ts` | Developer confusion |
| 🟢 LOW | Plan migration from `UPLOADS_DIR` disk to STORAGE layer | `services/local/storage.ts` | Architecture alignment |
