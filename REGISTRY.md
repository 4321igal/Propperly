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
| `WEB` | Web | web | [web/README.md](web/README.md) | skeleton | `APP` |
| `APP` | App | app | [app/README.md](app/README.md) | skeleton | `SVC` |
| `SVC` | Services | services | [services/README.md](services/README.md) | implemented | `ENG`, `DC` |
| `ENG` | Engine | engine | [engine/README.md](engine/README.md) | skeleton | `DC` |
| `DC` | Data Center | data-center | [data-center/README.md](data-center/README.md) | partial | `STO` |
| `STO` | Storage | storage | [storage/README.md](storage/README.md) | partial | — |
| `MCP` | MCP | mcp | [mcp/README.md](mcp/README.md) | implemented | `SVC` |
| `SVC-001` | Discovery | services | [services/PROCESSES.md#svc-001--discovery](services/PROCESSES.md#svc-001--discovery) | implemented | — |
| `ENG-001` | Reconstruction | engine | [engine/PROCESSES.md#eng-001--reconstruction](engine/PROCESSES.md#eng-001--reconstruction) | planned | `DC` |
| `ENG-002` | Understanding | engine | [engine/PROCESSES.md#eng-002--understanding](engine/PROCESSES.md#eng-002--understanding) | planned | `ENG-001` |
| `ENG-003` | Conflicts | engine | [engine/PROCESSES.md#eng-003--conflicts](engine/PROCESSES.md#eng-003--conflicts) | planned | TBD |
| `ENG-004` | Governance | engine | [engine/PROCESSES.md#eng-004--governance](engine/PROCESSES.md#eng-004--governance) | planned | TBD |
| `ENG-005` | Identity | engine | [engine/PROCESSES.md#eng-005--identity](engine/PROCESSES.md#eng-005--identity) | planned | TBD |
| `ENG-006` | Dependencies | engine | [engine/PROCESSES.md#eng-006--dependencies](engine/PROCESSES.md#eng-006--dependencies) | planned | TBD |
| `ENG-007` | Obligations | engine | [engine/PROCESSES.md#eng-007--obligations](engine/PROCESSES.md#eng-007--obligations) | planned | TBD |

Status values: **implemented** = production-ready logic exists; **partial** = real logic for specific sub-processes only; **skeleton** = README/CONTRACT/placeholder entry point only, no business logic.

See [README.md](README.md#status) for the full breakdown.

Engine was the pilot service for this layer (proposal section 9, stage 2);
Services now has its first sub-process row (`SVC-001`, SL-02 Source
Discovery) once that module's scope was identified. The remaining four
services get their `PROCESSES.md` and registry rows once their actual
sub-processes are identified (proposal section 11, decision 4).
