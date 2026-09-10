import type { Express, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { jwtVerify } from 'jose';
import { storeContent, readContent, removeContent } from '../storage.js';
import { upsertLocalFile, deleteLocalFile, listLocalFiles, searchLocalFiles, getLocalFileMeta } from '../db.js';
import { logToolCall } from '../../audit/index.js';
import { assertSafePath, assertStringParam } from '../../security/path-guard.js';

const MAX_CONTENT_BYTES = 10 * 1024 * 1024; // 10 MB decoded

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

export function registerLocalRoutes(app: Express): void {
  // Companion → Services: upload a file
  app.post('/api/local/files', async (req: Request, res: Response) => {
    const userId = await extractUserId(req);
    if (!userId) { res.status(401).json({ error: 'valid Bearer token required' }); return; }

    const { absolutePath, relativePath, name, sizeBytes, mimeType, contentHash, content } =
      req.body as Record<string, string>;

    try {
      assertSafePath(absolutePath, 'absolutePath');
      assertStringParam(name, 'name', 500);
      assertStringParam(content, 'content', MAX_CONTENT_BYTES * 2); // base64 overhead
    } catch (err) {
      res.status(400).json({ error: String(err) });
      return;
    }

    try {
      const buf = Buffer.from(content, 'base64');
      if (buf.length > MAX_CONTENT_BYTES) {
        res.status(413).json({ error: 'file too large (max 10 MB)' });
        return;
      }
      // Reject obvious binary blobs (null bytes in first 4KB)
      if (buf.slice(0, 4096).includes(0)) {
        res.status(400).json({ error: 'binary content not accepted' });
        return;
      }
      const storageKey = `${userId}/${randomUUID()}`;
      await storeContent(storageKey, buf);

      const id = await upsertLocalFile({
        userId,
        absolutePath,
        relativePath: relativePath ?? name,
        name,
        sizeBytes: Number(sizeBytes) || buf.length,
        mimeType: mimeType ?? 'text/plain',
        contentHash: contentHash ?? '',
        storageKey,
      });

      res.status(201).json({ id });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // Companion → Services: delete a file
  app.delete('/api/local/files', async (req: Request, res: Response) => {
    const userId = await extractUserId(req);
    if (!userId) { res.status(401).json({ error: 'valid Bearer token required' }); return; }

    const absolutePath = req.query['absolutePath'] as string | undefined;
    try { assertSafePath(absolutePath, 'absolutePath'); } catch (err) {
      res.status(400).json({ error: String(err) }); return;
    }

    const storageKey = await deleteLocalFile(userId, absolutePath!);
    if (storageKey) await removeContent(storageKey);
    res.status(204).send();
  });

  // MCP → Services: list indexed files
  app.get('/api/local/files', async (req: Request, res: Response) => {
    if (!checkInternalKey(req, res)) return;
    const t0 = Date.now();
    const { userId, folder } = req.query as Record<string, string>;
    if (!userId) { res.status(400).json({ error: 'userId required' }); return; }
    try {
      const files = await listLocalFiles(userId, folder);
      void logToolCall({ userId, toolName: 'list_local_files', inputArgs: { folder }, resultSummary: `${files.length} files`, durationMs: Date.now() - t0 });
      res.json({ files });
    } catch (err) {
      void logToolCall({ userId, toolName: 'list_local_files', inputArgs: { folder }, isError: true, resultSummary: String(err), durationMs: Date.now() - t0 });
      res.status(500).json({ error: String(err) });
    }
  });

  // MCP → Services: read file content by ID
  app.get('/api/local/files/:fileId/content', async (req: Request, res: Response) => {
    if (!checkInternalKey(req, res)) return;
    const t0 = Date.now();
    const { userId } = req.query as Record<string, string>;
    const { fileId } = req.params;
    if (!userId) { res.status(400).json({ error: 'userId required' }); return; }
    try {
      const meta = await getLocalFileMeta(userId, fileId);
      if (!meta) { res.status(404).json({ error: 'file not found' }); return; }
      const buf = await readContent(meta.storageKey);
      void logToolCall({ userId, toolName: 'read_local_file', inputArgs: { fileId }, resultSummary: `${buf.length} bytes`, durationMs: Date.now() - t0 });
      res.json({ content: buf.toString('utf-8'), mimeType: meta.mimeType, name: meta.name });
    } catch (err) {
      void logToolCall({ userId, toolName: 'read_local_file', inputArgs: { fileId }, isError: true, resultSummary: String(err), durationMs: Date.now() - t0 });
      res.status(500).json({ error: String(err) });
    }
  });

  // MCP → Services: search files by name/path
  app.get('/api/local/search', async (req: Request, res: Response) => {
    if (!checkInternalKey(req, res)) return;
    const t0 = Date.now();
    const { userId, q } = req.query as Record<string, string>;
    if (!userId || !q) { res.status(400).json({ error: 'userId and q required' }); return; }
    try {
      const files = await searchLocalFiles(userId, q);
      void logToolCall({ userId, toolName: 'search_local_files', inputArgs: { q }, resultSummary: `${files.length} results`, durationMs: Date.now() - t0 });
      res.json({ files });
    } catch (err) {
      void logToolCall({ userId, toolName: 'search_local_files', inputArgs: { q }, isError: true, resultSummary: String(err), durationMs: Date.now() - t0 });
      res.status(500).json({ error: String(err) });
    }
  });
}
