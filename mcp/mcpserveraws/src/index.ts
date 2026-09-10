import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express from 'express';

import { createServicesClient } from './services-client.js';
import { registerServicesTools } from './tools/services.js';
import { registerDriveTools } from './tools/drive.js';
import { registerGitTools } from './tools/git.js';
import { registerLocalTools } from './tools/local.js';
import { registerSessionTools } from './tools/sessions.js';
import { authMiddleware } from './auth/middleware.js';

const mode = process.env.MCP_MODE || 'stdio';

if (mode === 'http') {
  const app = express();
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  // Each request gets its own server instance scoped to the authenticated user.
  app.post('/mcp', authMiddleware, async (req, res) => {
    const userId = req.user?.userId;
    const services = createServicesClient(userId);

    const server = new McpServer({ name: 'propperly-mcp', version: '0.1.0' });
    registerServicesTools(server, services);
    registerDriveTools(server, services);
    registerGitTools(server, services);
    registerLocalTools(server, services);
    registerSessionTools(server, services);

    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, () => {
    console.error(`MCP server listening on port ${port} (http mode)`);
  });
} else {
  // Stdio mode: user identity from env (for local dev / Claude Code integration)
  const userId = process.env.USER_ID;
  const services = createServicesClient(userId);

  const server = new McpServer({ name: 'propperly-mcp', version: '0.1.0' });
  registerServicesTools(server, services);
  registerDriveTools(server, services);
  registerGitTools(server, services);
  registerLocalTools(server, services);
  registerSessionTools(server, services);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('MCP server started (stdio mode)');
}
