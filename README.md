# Propperly

Skeleton monorepo for the Propperly system, organized around seven services
with strict responsibility boundaries. No business/semantic logic is
implemented yet — this is structure only.

## Service map

```
        ┌─────────────┐
        │     WEB     │
        │ (React UI,  │
        │  no         │
        │  semantics) │
        └──────┬──────┘
               │ REST/GraphQL
               ▼
        ┌─────────────┐        ┌─────────────┐
        │     APP     │        │     MCP     │
        │ (BFF, no    │        │ (AI-facing  │
        │  semantics) │        │  adapter)   │
        └──────┬──────┘        └──────┬──────┘
               │  REST/GraphQL        │  calls Services only
               └───────────┬──────────┘
                            ▼
                     ┌─────────────┐
                     │  Services   │
                     │ (use-case   │
                     │ orchestration,
                     │ authz,      │
                     │ policy)     │
                     └──────┬──────┘
                            │ internal RPC (separate process)
                            ▼
                     ┌─────────────┐
                     │   Engine    │
                     │ (semantic   │
                     │  core)      │
                     └──────┬──────┘
                            │
                 ┌──────────┴──────────┐
                 ▼                     ▼
          ┌─────────────┐       ┌─────────────┐
          │ Data Center │──────▶│   Storage   │
          │ (structured │  ref  │ (raw object │
          │ persistence)│       │  storage)   │
          └─────────────┘       └─────────────┘
```

- **WEB → APP**: REST/GraphQL. WEB holds no semantic logic — it's the React
  UI; APP is its BFF and holds no UI/rendering.
- **APP → Services**: REST/GraphQL. APP holds no semantic logic.
- **MCP → Services**: JSON-RPC (stdio / HTTP+SSE) toward AI/Agent on one side,
  calls Services only on the other. MCP never calls Engine or Data Center
  directly.
- **Services → Engine**: internal RPC (stub). Engine runs as a separate
  process — never a direct import/function call.
- **Engine / Services → Data Center**: structured persistence, split into two
  models — Living Understanding (beliefs/tensions/revisions) and Governed
  World (subjects/identity/lifecycle/audit). Data Center does not interpret
  meaning.
- **Data Center → Storage**: linked by reference only (no raw blobs in
  Data Center). Storage is otherwise reached only through Services/Data
  Center metadata.

## Services

| Service | Responsibility | Folder |
|---|---|---|
| WEB | React UI (client) | [`web/`](web/README.md) |
| APP | API layer for WEB (BFF) | [`app/`](app/README.md) |
| Services | Use-case orchestration, authorization, policy | [`services/`](services/README.md) |
| Engine | Semantic core | [`engine/`](engine/README.md) |
| Data Center | Structured persistence | [`data-center/`](data-center/README.md) |
| Storage | Raw artifact storage | [`storage/`](storage/README.md) |
| MCP | AI-facing adapter | [`mcp/`](mcp/README.md) |

## Status

| Service | State | Notes |
|---|---|---|
| **MCP** | ✅ implemented | All tool adapters: Drive, Git, Local, Sessions. HTTP + stdio transports. JWT auth. |
| **Services** | ✅ implemented | Drive, Git, Local, Sessions, Discovery routes. OAuth (Google + GitHub). Audit logging. Rate limiting. |
| **Data Center** | ✅ partial | Workspace, Discovery, Candidate, Inventory stores (SL-02). Living-Understanding persistence TBD. |
| **Storage** | ✅ partial | NDJSON append-store (SL-02). Object storage (companion uploads). |
| **APP** | 🔲 skeleton | Placeholder entry + domain types. No BFF routes yet. |
| **WEB** | 🔲 skeleton | React entry point only. No screens. |
| **Engine** | 🔲 skeleton | Placeholder only. ENG-001–007 all planned. |

### What's running

- **`SVC-001` Source Discovery** (SL-02) — complete: source-access, filesystem scan, policy projection, identity deduplication, approval/confirmation flow. UI at `services/public/index.html`.
- **MCP tool adapters** — all 13 tools wired and callable from Claude Desktop / Claude Code.
- **Companion agent** (`services/companion/`) — watches local folders and AI session dirs, redacts secrets, syncs to Services.

### Open decisions / next up

- Engine sub-processes (ENG-001 Reconstruction through ENG-007 Obligations) are planned but not started.
- APP BFF routes and WEB screens depend on Engine.
- Deployment topology and CI/CD not yet decided.

See [`REGISTRY.md`](REGISTRY.md) for the fixed ID assigned to each service
and sub-process, per the
[organizational order proposal](propperly_organizational_order_proposal_en.md).
