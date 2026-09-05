# Storage

Raw artifact storage (object storage), S3-compatible. Linked to Data Center
by reference only.

## Not allowed to do

- Be accessed directly by APP, MCP, or Engine — only Services/Data Center
  metadata may reach it.
- Interpret or index artifact contents — it stores bytes, not meaning.
- Decide on deployment topology (bucket layout, retention policy) here.

## Contract

See [`CONTRACT.md`](CONTRACT.md) for the object storage interface shape.
