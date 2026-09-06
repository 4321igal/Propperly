import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";

import { createServicesClient } from "./services-client.js";
import { registerServicesTools } from "./tools/services.js";
import { apiKeyAuth } from "./auth/middleware.js";

const services = createServicesClient();

const server = new McpServer({
  name: "propperly-mcp",
  version: "0.0.0",
});

registerServicesTools(server, services);

const mode = process.env.MCP_MODE || "stdio";

if (mode === "http") {
  const app = express();
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  app.post("/mcp", apiKeyAuth, async (req, res) => {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, () => {
    console.error(`MCP server listening on port ${port} (http mode)`);
  });
} else {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MCP server started (stdio mode)");
}
