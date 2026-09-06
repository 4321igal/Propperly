// Stub client toward Services. MCP must never call Engine or Data Center
// directly, and must never duplicate Services' authorization/policy logic —
// every tool call is routed through this client. See ../CONTRACT.md.

export interface ServicesClient {
  ping(): Promise<{ status: string }>;
}

export function createServicesClient(): ServicesClient {
  return {
    async ping() {
      // Placeholder: real implementation will call Services over its
      // external transport (REST/GraphQL) — not a direct import/function
      // call into Services' code.
      throw new Error("not implemented");
    },
  };
}
