# Prompt: Initial Project Skeleton – Propperly

> Intended to be run against a coding agent (e.g. Claude Code) that will actually generate the initial project structure. This prompt is based on "Propperly – Target System Architecture v1" and the "Services Architecture – High Level v1" document.
> **Assumption:** a single monorepo with a workspace per service (can be swapped for separate repos — just change section 2 below).

---

## Context

The project is built from six logical services, each an independent entity with a clear responsibility boundary:

1. **APP** – User interface. Displays state, collects input/decisions. Holds no semantic logic.
2. **Services** – Use-case orchestration, authorization, policy. Calls Engine/Data Center/Storage. Does not duplicate Engine's rules.
3. **ENGINE** – The semantic core (reconstruction, understanding, conflicts, governance, identity, dependencies, obligations). **Runs as a separate process from Services**, communicating with it via internal RPC (not a function call). Knows nothing about HTTP/MCP.
4. **DATA CENTER** – Structured persistence. Two distinct models: Living Understanding (beliefs/tensions/revisions) and Governed World (subjects/identity/lifecycle/audit). Does not interpret meaning.
5. **STORAGE** – Raw artifact storage (object storage). Linked to Data Center by reference only.
6. **MCP** – AI-facing adapter. MCP protocol (JSON-RPC over stdio/HTTP+SSE), Tool Registry/Dispatcher that routes to Services only. Does not write to canonical state directly.

Recommended technology direction per service (high level, not final):

| Service | Suggested language/technology | External communication |
|---|---|---|
| APP | React/Vue/Svelte-class (component framework) | REST/GraphQL to Services |
| Services | TypeScript (Node) / Go / Python | REST/GraphQL toward APP and MCP; internal RPC toward Engine |
| ENGINE | Same language family as Services, or Python if LLM integration is involved | Internal RPC only (not protocol-facing) |
| DATA CENTER | PostgreSQL-class for Governed World; a graph/document DB possible for Living Understanding | Accessed only through Engine/Services |
| STORAGE | S3-compatible object storage | Accessed only through Services/Data Center metadata |
| MCP | Same language as Services (shared types) | JSON-RPC (stdio / HTTP+SSE) toward AI/Agent; calls Services only |

---

## Task

Create an initial project skeleton only — **no actual business/semantic logic**. The goal is to establish the code's organizational structure so it reflects the responsibility boundaries above, before any real implementation begins.

For each of the six services:

1. A separate folder (workspace) named: `app/`, `services/`, `engine/`, `data-center/`, `storage/`, `mcp/`.
2. A `README.md` inside each folder that summarizes:
   - The service's responsibility (one to two sentences)
   - "What this service is **not** allowed to do" (from the table above)
3. A minimal placeholder entry point in the recommended technology for that service — a file that prints/returns "service X is up", with no other logic.
4. A `CONTRACT.md` file, or `contract.ts`/schema (depending on the technology), describing **only the shape of the service's external interface** (which calls it exposes / expects to receive) — still no implementation, just signatures/types.

In addition:

5. A root-level `README.md` explaining the overall service map (the general flow diagram from APP/MCP ↓ Services ↓ Engine/Data Center/Storage) and linking to each service's README.
6. A monorepo-level workspace definition (e.g. a `package.json` with workspaces, or the equivalent for the chosen technology) — **only** the linkage between folders, no build/CI decisions.

---

## Explicit constraints

- **Do not** write business logic, semantic logic, or real DB/Storage access — placeholders only.
- **Do not** decide on deployment topology, CI/CD, instance counts, or a full DB schema here.
- **Do not** mix responsibilities across services — if it's unclear which service something belongs to, stop and ask before proceeding.
- The Services↔Engine connection must be expressed as an RPC call (stub), not as a direct import/function call.
- MCP does not call Engine/Data Center directly — only Services.

## Expected output

A complete folder tree plus the files described above, with concise placeholder content only. At the end, a short summary: which technology assumptions were actually applied (if they differed from the table above) and what's still left to decide.
