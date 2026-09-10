import type { Express, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { getGitHubAuthUrl, exchangeGitHubCode, issueGitHubJwt } from '../oauth.js';
import { listRepos, searchCode, getPrDiff, getCommitHistory } from '../client.js';
import { logToolCall } from '../../audit/index.js';

function checkInternalKey(req: Request, res: Response): boolean {
  const expected = process.env.INTERNAL_API_KEY;
  if (!expected) return true;
  if (req.header('x-internal-key') !== expected) {
    res.status(401).json({ error: 'unauthorized' });
    return false;
  }
  return true;
}

export function registerGitRoutes(app: Express): void {
  // OAuth: initiate GitHub consent
  app.get('/oauth/github/authorize', (req: Request, res: Response) => {
    const state = (req.query['user_id'] as string | undefined) ?? randomUUID();
    res.redirect(getGitHubAuthUrl(state));
  });

  // OAuth: callback — exchange code, persist token, return JWT
  app.get('/oauth/github/callback', async (req: Request, res: Response) => {
    try {
      const code = req.query['code'] as string | undefined;
      if (!code) { res.status(400).json({ error: 'code missing' }); return; }
      const { userId, githubLogin } = await exchangeGitHubCode(code);
      const token = await issueGitHubJwt(userId, githubLogin);
      res.json({
        token,
        userId,
        githubLogin,
        hint: 'Use this token as: Authorization: Bearer <token>',
      });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // Git: list repositories
  app.get('/api/git/repos', async (req: Request, res: Response) => {
    if (!checkInternalKey(req, res)) return;
    const t0 = Date.now();
    const { userId, org, page, perPage } = req.query as Record<string, string>;
    if (!userId) { res.status(400).json({ error: 'userId required' }); return; }
    try {
      const result = await listRepos(userId, {
        org,
        page: page ? Number(page) : undefined,
        perPage: perPage ? Number(perPage) : undefined,
      });
      void logToolCall({ userId, toolName: 'list_repos', inputArgs: { org }, resultSummary: `${result.repos.length} repos`, durationMs: Date.now() - t0 });
      res.json(result);
    } catch (err) {
      void logToolCall({ userId, toolName: 'list_repos', inputArgs: { org }, isError: true, resultSummary: String(err), durationMs: Date.now() - t0 });
      res.status(500).json({ error: String(err) });
    }
  });

  // Git: search code
  app.get('/api/git/search', async (req: Request, res: Response) => {
    if (!checkInternalKey(req, res)) return;
    const t0 = Date.now();
    const { userId, q, repo, org, page } = req.query as Record<string, string>;
    if (!userId || !q) { res.status(400).json({ error: 'userId and q required' }); return; }
    try {
      const result = await searchCode(userId, q, { repo, org, page: page ? Number(page) : undefined });
      void logToolCall({ userId, toolName: 'search_code', inputArgs: { q, repo, org }, resultSummary: `${result.items.length}/${result.totalCount} results`, durationMs: Date.now() - t0 });
      res.json(result);
    } catch (err) {
      void logToolCall({ userId, toolName: 'search_code', inputArgs: { q }, isError: true, resultSummary: String(err), durationMs: Date.now() - t0 });
      res.status(500).json({ error: String(err) });
    }
  });

  // Git: get PR diff
  app.get('/api/git/repos/:owner/:repo/pulls/:number/diff', async (req: Request, res: Response) => {
    if (!checkInternalKey(req, res)) return;
    const t0 = Date.now();
    const { userId } = req.query as Record<string, string>;
    const { owner, repo, number: num } = req.params;
    if (!userId) { res.status(400).json({ error: 'userId required' }); return; }
    const pullNumber = Number(num);
    if (isNaN(pullNumber)) { res.status(400).json({ error: 'invalid pull number' }); return; }
    try {
      const result = await getPrDiff(userId, owner, repo, pullNumber);
      void logToolCall({ userId, toolName: 'get_pr_diff', inputArgs: { owner, repo, pullNumber }, resultSummary: `${result.diff.length} chars`, durationMs: Date.now() - t0 });
      res.json(result);
    } catch (err) {
      void logToolCall({ userId, toolName: 'get_pr_diff', inputArgs: { owner, repo, pullNumber }, isError: true, resultSummary: String(err), durationMs: Date.now() - t0 });
      res.status(500).json({ error: String(err) });
    }
  });

  // Git: commit history
  app.get('/api/git/repos/:owner/:repo/commits', async (req: Request, res: Response) => {
    if (!checkInternalKey(req, res)) return;
    const t0 = Date.now();
    const { userId, branch, page, perPage } = req.query as Record<string, string>;
    const { owner, repo } = req.params;
    if (!userId) { res.status(400).json({ error: 'userId required' }); return; }
    try {
      const result = await getCommitHistory(userId, owner, repo, {
        branch,
        page: page ? Number(page) : undefined,
        perPage: perPage ? Number(perPage) : undefined,
      });
      void logToolCall({ userId, toolName: 'get_commit_history', inputArgs: { owner, repo, branch }, resultSummary: `${result.commits.length} commits`, durationMs: Date.now() - t0 });
      res.json(result);
    } catch (err) {
      void logToolCall({ userId, toolName: 'get_commit_history', inputArgs: { owner, repo }, isError: true, resultSummary: String(err), durationMs: Date.now() - t0 });
      res.status(500).json({ error: String(err) });
    }
  });
}
