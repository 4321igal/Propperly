import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ServicesClient } from '../services-client.js';

export function registerDriveTools(server: McpServer, services: ServicesClient): void {
  server.tool(
    'list_drive_files',
    'List files in the authenticated user\'s Google Drive. Optionally filter by parent folder ID.',
    {
      parentId: z.string().optional().describe('Parent folder ID. Omit to list root.'),
      pageToken: z.string().optional().describe('Pagination token from a previous response.'),
    },
    async ({ parentId, pageToken }) => {
      try {
        const result = await services.drive.listFiles({ parentId, pageToken });
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      } catch (err: any) {
        return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
      }
    }
  );

  server.tool(
    'read_drive_file',
    'Read the text content of a Google Drive file by its file ID.',
    {
      fileId: z.string().describe('The Drive file ID to read.'),
    },
    async ({ fileId }) => {
      try {
        const result = await services.drive.readFile(fileId);
        return { content: [{ type: 'text', text: result.content }] };
      } catch (err: any) {
        return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
      }
    }
  );

  server.tool(
    'search_drive',
    'Full-text search across the authenticated user\'s Google Drive files.',
    {
      query: z.string().describe('Search query string.'),
      pageToken: z.string().optional().describe('Pagination token from a previous response.'),
    },
    async ({ query, pageToken }) => {
      try {
        const result = await services.drive.searchFiles(query, pageToken);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      } catch (err: any) {
        return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
      }
    }
  );
}
