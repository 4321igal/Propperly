import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ServicesClient } from '../services-client.js';

export function registerSessionTools(server: McpServer, services: ServicesClient): void {
  server.tool(
    'search_sessions',
    'Search through AI session logs (Claude Code, Cursor, VSCode) synced by the companion agent. Useful for finding past conversations, code changes, or topics you worked on.',
    {
      query: z.string().describe('Search term to look for in session titles and content.'),
      limit: z.number().int().min(1).max(50).optional().describe('Max results (default 20).'),
    },
    async ({ query, limit }) => {
      try {
        const result = await services.sessions.search(query, limit);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      } catch (err: any) {
        return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
      }
    }
  );

  server.tool(
    'get_recent_activity',
    'Get a summary of recent AI session activity — total sessions, breakdown by tool (Claude Code / Cursor / VSCode), and the most recent sessions.',
    {},
    async () => {
      try {
        const result = await services.sessions.getActivity();
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      } catch (err: any) {
        return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
      }
    }
  );
}
