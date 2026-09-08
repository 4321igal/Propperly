# WEB

React UI for Propperly. Displays state and collects user input/decisions by
calling the APP API (REST/GraphQL).

## Not allowed to do

- Hold semantic logic (interpretation, reconciliation, policy decisions) —
  that belongs to Engine/Services.
- Call Services, Engine, Data Center, Storage, or MCP directly — only APP.
- Duplicate validation/authorization rules owned by Services/APP.

## Contract

See [`CONTRACT.md`](CONTRACT.md) for the shape of the APP API this app
consumes.
