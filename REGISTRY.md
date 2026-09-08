# Registry

Single source of truth for every process ID in the system — services and
their sub-processes — per the root
[organizational order proposal](propperly_organizational_order_proposal_en.md).
Hand-maintained for now; `registry.json` is introduced later (proposal
section 11, decision 2), alongside the validation script that reads it.

**Rule:** no new sub-process/module is added without first adding a row
here and a matching section in the owning service's `PROCESSES.md`
(proposal section 8).

| ID | Name | Service | Doc | Status | Depends on |
|---|---|---|---|---|---|
| `WEB` | Web | web | [web/README.md](web/README.md) | in-progress | `APP` |
| `APP` | App | app | [app/README.md](app/README.md) | in-progress | `SVC` |
| `SVC` | Services | services | [services/README.md](services/README.md) | in-progress | `ENG`, `DC` |
| `ENG` | Engine | engine | [engine/README.md](engine/README.md) | in-progress | `DC` |
| `DC` | Data Center | data-center | [data-center/README.md](data-center/README.md) | in-progress | `STO` |
| `STO` | Storage | storage | [storage/README.md](storage/README.md) | in-progress | — |
| `MCP` | MCP | mcp | [mcp/README.md](mcp/README.md) | in-progress | `SVC` |
| `ENG-001` | Reconstruction | engine | [engine/PROCESSES.md#eng-001--reconstruction](engine/PROCESSES.md#eng-001--reconstruction) | planned | `DC` |
| `ENG-002` | Understanding | engine | [engine/PROCESSES.md#eng-002--understanding](engine/PROCESSES.md#eng-002--understanding) | planned | `ENG-001` |
| `ENG-003` | Conflicts | engine | [engine/PROCESSES.md#eng-003--conflicts](engine/PROCESSES.md#eng-003--conflicts) | planned | TBD |
| `ENG-004` | Governance | engine | [engine/PROCESSES.md#eng-004--governance](engine/PROCESSES.md#eng-004--governance) | planned | TBD |
| `ENG-005` | Identity | engine | [engine/PROCESSES.md#eng-005--identity](engine/PROCESSES.md#eng-005--identity) | planned | TBD |
| `ENG-006` | Dependencies | engine | [engine/PROCESSES.md#eng-006--dependencies](engine/PROCESSES.md#eng-006--dependencies) | planned | TBD |
| `ENG-007` | Obligations | engine | [engine/PROCESSES.md#eng-007--obligations](engine/PROCESSES.md#eng-007--obligations) | planned | TBD |

`in-progress` here means the service's skeleton (README/CONTRACT/placeholder
entry point) exists but no business/semantic logic has been implemented yet
— see the root [README.md](README.md#status).

Only Engine has sub-process rows so far: it's the pilot service for this
layer (proposal section 9, stage 2). The other five services get their
`PROCESSES.md` and registry rows once their actual sub-processes are
identified (proposal section 11, decision 4).
