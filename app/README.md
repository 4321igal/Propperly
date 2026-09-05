# APP

User interface for Propperly. Displays state and collects user input/decisions
by calling the Services API (REST/GraphQL).

## Not allowed to do

- Hold semantic logic (interpretation, reconciliation, policy decisions) —
  that belongs to Engine/Services.
- Call Engine, Data Center, Storage, or MCP directly — only Services.
- Duplicate validation/authorization rules owned by Services.

## Contract

See [`src/contract.ts`](src/contract.ts) for the shape of the Services API
this app consumes.
