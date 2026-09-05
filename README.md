# Propperly

Skeleton monorepo for the Propperly system, organized around six services with
strict responsibility boundaries. No business/semantic logic is implemented
yet — this is structure only.

## Service map

```
        ┌─────────────┐        ┌─────────────┐
        │     APP     │        │     MCP     │
        │ (UI, no     │        │ (AI-facing  │
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
| APP | User interface | [`app/`](app/README.md) |
| Services | Use-case orchestration, authorization, policy | [`services/`](services/README.md) |
| Engine | Semantic core | [`engine/`](engine/README.md) |
| Data Center | Structured persistence | [`data-center/`](data-center/README.md) |
| Storage | Raw artifact storage | [`storage/`](storage/README.md) |
| MCP | AI-facing adapter | [`mcp/`](mcp/README.md) |

## Status

This is an initial skeleton: folder structure, per-service README/CONTRACT,
and a placeholder entry point per service. No business logic, no real
database/storage access, no deployment topology or CI/CD decisions.

See the bottom of `propperly_initial_project_prompt_en.md` for the originating
prompt, and the summary at the end of the PR/commit that introduced this
skeleton for open decisions.
