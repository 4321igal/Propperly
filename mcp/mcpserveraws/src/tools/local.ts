import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ServicesClient } from '../services-client.js';

export function registerLocalTools(server: McpServer, services: ServicesClient): void {
  server.tool(
    'list_local_files',
    'List files that the Propperly companion agent has synced from the user\'s local machine.',
    {
      folder: z.string().optional().describe('Filter by folder prefix (relative path).'),
    },
    async ({ folder }) => {
      try {
        const result = await services.local.listFiles({ folder });
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      } catch (err: any) {
        return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
      }
    }
  );

  server.tool(
    'read_local_file',
    'Read the content of a local file synced by the companion agent. Use list_local_files or search_local_files to find the file ID.',
    {
      fileId: z.string().describe('The file ID from list_local_files or search_local_files.'),
    },
    async ({ fileId }) => {
      try {
        const result = await services.local.readFile(fileId);
        return { content: [{ type: 'text', text: result.content }] };
      } catch (err: any) {
        return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
      }
    }
  );

  server.tool(
    'search_local_files',
    'Search synced local files by filename or relative path.',
    {
      query: z.string().describe('Search term to match against filenames and paths.'),
    },
    async ({ query }) => {
      try {
        const result = await services.local.searchFiles(query);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      } catch (err: any) {
        return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
      }
    }
  );
}
