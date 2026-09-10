import type { Express, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { getAuthorizationUrl, exchangeCodeForTokens, issueJwt } from '../oauth.js';
import { listFiles, readFile, searchFiles } from '../client.js';
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

export function registerDriveRoutes(app: Express): void {
  // OAuth: initiate Google consent flow
  app.get('/oauth/google/authorize', (req: Request, res: Response) => {
    const state = (req.query['user_id'] as string | undefined) ?? randomUUID();
    res.redirect(getAuthorizationUrl(state));
  });

  // OAuth: callback — exchange code, persist tokens, return JWT
  app.get('/oauth/google/callback', async (req: Request, res: Response) => {
    try {
      const code = req.query['code'] as string | undefined;
      if (!code) { res.status(400).json({ error: 'code missing' }); return; }
      const { userId, email } = await exchangeCodeForTokens(code);
      const token = await issueJwt(userId, email);
      res.json({
        token,
        userId,
        email,
        hint: 'Add this to Claude Desktop config: "headers": { "Authorization": "Bearer <token>" }',
      });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // Drive: list files — called internally by MCP ServicesClient
  app.get('/api/drive/files', async (req: Request, res: Response) => {
    if (!checkInternalKey(req, res)) return;
    const t0 = Date.now();
    const { userId, parentId, pageToken } = req.query as Record<string, string>;
    if (!userId) { res.status(400).json({ error: 'userId required' }); return; }
    try {
      const result = await listFiles(userId, parentId, pageToken);
      void logToolCall({ userId, toolName: 'list_drive_files', inputArgs: { parentId, pageToken }, resultSummary: `${result.files.length} files`, durationMs: Date.now() - t0 });
      res.json(result);
    } catch (err) {
      void logToolCall({ userId, toolName: 'list_drive_files', inputArgs: { parentId }, isError: true, resultSummary: String(err), durationMs: Date.now() - t0 });
      res.status(500).json({ error: String(err) });
    }
  });

  // Drive: read file content
  app.get('/api/drive/files/:fileId/content', async (req: Request, res: Response) => {
    if (!checkInternalKey(req, res)) return;
    const t0 = Date.now();
    const { userId } = req.query as Record<string, string>;
    const { fileId } = req.params;
    if (!userId) { res.status(400).json({ error: 'userId required' }); return; }
    try {
      const result = await readFile(userId, fileId);
      void logToolCall({ userId, toolName: 'read_drive_file', inputArgs: { fileId }, resultSummary: `${result.content.length} chars`, durationMs: Date.now() - t0 });
      res.json(result);
    } catch (err) {
      void logToolCall({ userId, toolName: 'read_drive_file', inputArgs: { fileId }, isError: true, resultSummary: String(err), durationMs: Date.now() - t0 });
      res.status(500).json({ error: String(err) });
    }
  });

  // Drive: full-text search
  app.get('/api/drive/search', async (req: Request, res: Response) => {
    if (!checkInternalKey(req, res)) return;
    const t0 = Date.now();
    const { userId, q, pageToken } = req.query as Record<string, string>;
    if (!userId || !q) { res.status(400).json({ error: 'userId and q required' }); return; }
    try {
      const result = await searchFiles(userId, q, pageToken);
      void logToolCall({ userId, toolName: 'search_drive', inputArgs: { q }, resultSummary: `${result.files.length} results`, durationMs: Date.now() - t0 });
      res.json(result);
    } catch (err) {
      void logToolCall({ userId, toolName: 'search_drive', inputArgs: { q }, isError: true, resultSummary: String(err), durationMs: Date.now() - t0 });
      res.status(500).json({ error: String(err) });
    }
  });
}
