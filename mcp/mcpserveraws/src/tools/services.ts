// Tool Registry entries that route to Services only. No other service is
// called from here, and no canonical state is written directly — see
// ../../CONTRACT.md and ../../README.md ("Not allowed to do").

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ServicesClient } from "../services-client.js";

export function registerServicesTools(server: McpServer, services: ServicesClient): void {
  server.tool(
    "services_ping",
    "Check whether the Services layer is reachable",
    {},
    async () => {
      try {
        const result = await services.ping();
        return {
          content: [{ type: "text", text: JSON.stringify(result) }],
        };
      } catch (error: any) {
        return {
          content: [{ type: "text", text: `Error: ${error.message}` }],
          isError: true,
        };
      }
    }
  );
}
