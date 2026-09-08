# APP

Backend-for-Frontend (BFF) for WEB. Serves WEB's React UI by calling the
Services API (REST/GraphQL).

## Not allowed to do

- Hold semantic logic (interpretation, reconciliation, policy decisions) —
  that belongs to Engine/Services.
- Hold UI/rendering logic — that belongs to WEB.
- Call Engine, Data Center, Storage, or MCP directly — only Services.
- Duplicate validation/authorization rules owned by Services.

## Contract

See [`CONTRACT.md`](CONTRACT.md) for the shape of the Services API this app
consumes, and the API this app exposes to WEB.
