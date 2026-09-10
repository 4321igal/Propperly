import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ServicesClient } from '../services-client.js';

export function registerGitTools(server: McpServer, services: ServicesClient): void {
  server.tool(
    'list_repos',
    'List GitHub repositories accessible to the authenticated user. Optionally filter by organization.',
    {
      org: z.string().optional().describe('GitHub organization name. Omit to list all user repos.'),
      page: z.number().int().positive().optional().describe('Page number (default 1).'),
      perPage: z.number().int().min(1).max(100).optional().describe('Results per page (default 30).'),
    },
    async ({ org, page, perPage }) => {
      try {
        const result = await services.git.listRepos({ org, page, perPage });
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      } catch (err: any) {
        return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
      }
    }
  );

  server.tool(
    'search_code',
    'Search code across GitHub repositories. Scope the search with repo or org to avoid broad results.',
    {
      query: z.string().describe('Search query (e.g. "useState" or "class Auth").'),
      repo: z.string().optional().describe('Limit to a single repo in "owner/repo" format.'),
      org: z.string().optional().describe('Limit to a GitHub organization.'),
      page: z.number().int().positive().optional().describe('Page number (default 1).'),
    },
    async ({ query, repo, org, page }) => {
      try {
        const result = await services.git.searchCode(query, { repo, org, page });
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      } catch (err: any) {
        return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
      }
    }
  );

  server.tool(
    'get_pr_diff',
    'Get the unified diff of a GitHub pull request.',
    {
      owner: z.string().describe('Repository owner (user or org).'),
      repo: z.string().describe('Repository name.'),
      pullNumber: z.number().int().positive().describe('Pull request number.'),
    },
    async ({ owner, repo, pullNumber }) => {
      try {
        const result = await services.git.getPrDiff(owner, repo, pullNumber);
        const summary = `PR #${pullNumber}: ${result.title} [${result.state}]\n\n${result.diff}`;
        return { content: [{ type: 'text', text: summary }] };
      } catch (err: any) {
        return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
      }
    }
  );

  server.tool(
    'get_commit_history',
    'Get the commit history of a GitHub repository branch.',
    {
      owner: z.string().describe('Repository owner (user or org).'),
      repo: z.string().describe('Repository name.'),
      branch: z.string().optional().describe('Branch name or SHA (default: repo default branch).'),
      page: z.number().int().positive().optional().describe('Page number (default 1).'),
      perPage: z.number().int().min(1).max(100).optional().describe('Results per page (default 20).'),
    },
    async ({ owner, repo, branch, page, perPage }) => {
      try {
        const result = await services.git.getCommitHistory(owner, repo, { branch, page, perPage });
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      } catch (err: any) {
        return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
      }
    }
  );
}
