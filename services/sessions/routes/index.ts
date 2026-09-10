import type { Express, Request, Response } from 'express';
import { jwtVerify } from 'jose';
import { upsertSession, searchSessions, getRecentActivity } from '../db.js';
import { logToolCall } from '../../audit/index.js';
import { assertSafePath, assertStringParam } from '../../security/path-guard.js';

const MAX_SESSION_BYTES = 55_000; // just over our 50KB filter limit

const getJwtSecret = () =>
  new TextEncoder().encode(process.env.JWT_SECRET ?? 'insecure-dev-secret');

async function extractUserId(req: Request): Promise<string | null> {
  const authHeader = req.header('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  try {
    const { payload } = await jwtVerify(authHeader.slice(7), getJwtSecret());
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

function checkInternalKey(req: Request, res: Response): boolean {
  const expected = process.env.INTERNAL_API_KEY;
  if (!expected) return true;
  if (req.header('x-internal-key') !== expected) {
    res.status(401).json({ error: 'unauthorized' });
    return false;
  }
  return true;
}

export function registerSessionRoutes(app: Express): void {
  // Companion → Services: upload a session file
  app.post('/api/sessions', async (req: Request, res: Response) => {
    const userId = await extractUserId(req);
    if (!userId) { res.status(401).json({ error: 'valid Bearer token required' }); return; }

    const { sessionPath, tool, title, content, contentHash, sizeBytes, sessionDate } =
      req.body as Record<string, string>;

    try {
      assertSafePath(sessionPath, 'sessionPath');
      assertStringParam(content, 'content', MAX_SESSION_BYTES);
    } catch (err) {
      res.status(400).json({ error: String(err) });
      return;
    }

    try {
      const id = await upsertSession({
        userId,
        sessionPath,
        tool: tool ?? 'other',
        title: title ?? '',
        content,
        contentHash: contentHash ?? '',
        sizeBytes: Number(sizeBytes) || 0,
        sessionDate: sessionDate ? new Date(sessionDate) : new Date(),
      });
      res.status(201).json({ id });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // MCP → Services: search sessions
  app.get('/api/sessions/search', async (req: Request, res: Response) => {
    if (!checkInternalKey(req, res)) return;
    const t0 = Date.now();
    const { userId, q, limit } = req.query as Record<string, string>;
    if (!userId || !q) { res.status(400).json({ error: 'userId and q required' }); return; }
    try {
      const sessions = await searchSessions(userId, q, limit ? Number(limit) : undefined);
      void logToolCall({ userId, toolName: 'search_sessions', inputArgs: { q }, resultSummary: `${sessions.length} results`, durationMs: Date.now() - t0 });
      res.json({ sessions });
    } catch (err) {
      void logToolCall({ userId, toolName: 'search_sessions', inputArgs: { q }, isError: true, resultSummary: String(err), durationMs: Date.now() - t0 });
      res.status(500).json({ error: String(err) });
    }
  });

  // MCP → Services: recent activity summary
  app.get('/api/sessions/activity', async (req: Request, res: Response) => {
    if (!checkInternalKey(req, res)) return;
    const t0 = Date.now();
    const { userId } = req.query as Record<string, string>;
    if (!userId) { res.status(400).json({ error: 'userId required' }); return; }
    try {
      const activity = await getRecentActivity(userId);
      void logToolCall({ userId, toolName: 'get_recent_activity', inputArgs: {}, resultSummary: `${activity.totalSessions} sessions`, durationMs: Date.now() - t0 });
      res.json(activity);
    } catch (err) {
      void logToolCall({ userId, toolName: 'get_recent_activity', inputArgs: {}, isError: true, resultSummary: String(err), durationMs: Date.now() - t0 });
      res.status(500).json({ error: String(err) });
    }
  });
}
