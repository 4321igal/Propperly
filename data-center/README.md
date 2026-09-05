# Data Center

Structured persistence, split into two distinct models:

- **Living Understanding** — beliefs, tensions, revisions.
- **Governed World** — subjects, identity, lifecycle, audit.

## Not allowed to do

- Interpret meaning — it stores what Engine/Services give it, it doesn't
  reason about it.
- Be accessed directly by APP or MCP — only Engine/Services may reach it.
- Store raw artifacts — those live in Storage; Data Center holds references
  only.
- Decide on a full DB schema here — this skeleton only sketches the
  interface shape.

## Contract

See [`CONTRACT.md`](CONTRACT.md) for the access interface shape (no full
schema).
