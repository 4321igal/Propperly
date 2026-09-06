# Deploying MCP

Adapted from `../../Prompt/McpServerAws.md`. The key difference from that
generic guide: this service has no AWS SDK clients and no IAM permissions
toward DynamoDB/S3 — it only ever calls Services (see `../../CONTRACT.md`,
`../../README.md`). `iam-policy.json` reflects that: logs plus reading the
`MCP_API_KEY` secret, nothing else.

## Options

- **ECS Fargate** (`ecs-task-def.json`) — the concrete path today, since
  `src/index.ts` already runs a real HTTP listener (`MCP_MODE=http`) built by
  the `Dockerfile`. Build/push the image, register the task definition
  (fill in `ACCOUNT_ID`/`REGION`), then create a service behind an ALB.
- **Lambda + API Gateway** (`template.yaml`) — cheapest for low traffic, but
  `dist/index.handler` does not exist yet: the entry point starts an Express
  listener directly rather than exporting a Lambda handler. Wiring this up
  needs a Lambda HTTP adapter (e.g. `@vendia/serverless-express`) before this
  template will actually deploy — treat it as a starting point, not a
  finished path.
- **Bedrock AgentCore** — not evaluated here; see `../../Prompt/McpServerAws.md`
  for the CLI shape if this becomes the preferred path.

## Required configuration

- `SERVICES_URL` — base URL of the Services deployment this MCP instance is
  allowed to call. There is no default; `services-client.ts` has no real
  transport wired in yet (see `../src/services-client.ts`), so this is a
  placeholder until Services exposes a real endpoint.
- `MCP_API_KEY` — shared secret required in the `x-mcp-api-key` header. If
  unset, the HTTP listener accepts unauthenticated requests (fine for local
  testing, not for a real deployment).
