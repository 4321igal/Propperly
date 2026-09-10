import { readdir, readFile, stat, readFile as rf, writeFile, mkdir } from 'node:fs/promises';
import { join, basename } from 'node:path';
import { homedir } from 'node:os';
import { createHash } from 'node:crypto';
import type { CompanionConfig } from './config.js';
import { filterSecrets } from './secrets-filter.js';

const CACHE_PATH = join(homedir(), '.propperly', 'session-cache.json');
const MAX_CONTENT_BYTES = 50_000; // 50KB stored per session
const SESSION_EXTENSIONS = new Set(['.jsonl', '.json', '.md', '.log', '.txt']);

interface CacheEntry {
  contentHash: string;
  uploadedAt: string;
}
interface SessionCache {
  version: number;
  entries: Record<string, CacheEntry>;
}

async function loadCache(): Promise<SessionCache> {
  try {
    const raw = await rf(CACHE_PATH, 'utf-8');
    return JSON.parse(raw) as SessionCache;
  } catch {
    return { version: 1, entries: {} };
  }
}

async function saveCache(cache: SessionCache): Promise<void> {
  await mkdir(join(homedir(), '.propperly'), { recursive: true });
  await writeFile(CACHE_PATH, JSON.stringify(cache, null, 2), 'utf-8');
}

export type SessionTool = 'claude-code' | 'cursor' | 'vscode' | 'other';

export interface SessionDir {
  tool: SessionTool;
  dir: string;
}

export function detectSessionDirs(): SessionDir[] {
  const home = homedir();
  const isWin = process.platform === 'win32';
  const isMac = process.platform === 'darwin';
  const appData = process.env.APPDATA ?? home;
  const appSupport = isMac ? join(home, 'Library', 'Application Support') : appData;

  return [
    {
      tool: 'claude-code',
      dir: isWin
        ? join(appData, 'Claude', 'projects')
        : join(home, '.claude', 'projects'),
    },
    {
      tool: 'cursor',
      dir: isWin
        ? join(appData, 'Cursor', 'logs')
        : join(home, '.cursor', 'logs'),
    },
    {
      tool: 'vscode',
      dir: isWin
        ? join(appData, 'Code', 'logs')
        : join(appSupport, 'Code', 'logs'),
    },
  ];
}

function extractTitle(content: string, tool: SessionTool, filename: string): string {
  if (tool === 'claude-code') {
    for (const line of content.split('\n').slice(0, 30)) {
      try {
        const msg = JSON.parse(line) as Record<string, unknown>;
        if (msg['type'] === 'human' || msg['role'] === 'user') {
          const c = msg['content'];
          if (typeof c === 'string' && c.trim()) return c.slice(0, 120);
          if (Array.isArray(c)) {
            const part = (c as Array<Record<string, unknown>>).find((p) => p['type'] === 'text');
            if (part && typeof part['text'] === 'string') return (part['text'] as string).slice(0, 120);
          }
        }
      } catch { /* not a JSON line */ }
    }
  }
  return basename(filename, '.jsonl').replace(/[_\-]/g, ' ').slice(0, 120);
}

async function uploadSession(config: CompanionConfig, payload: {
  sessionPath: string;
  tool: string;
  title: string;
  content: string;
  contentHash: string;
  sizeBytes: number;
  sessionDate: string;
}): Promise<void> {
  const res = await fetch(`${config.servicesUrl}/api/sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`Session upload ${res.status}: ${await res.text().catch(() => '')}`);
  }
}

export async function scanSessions(config: CompanionConfig): Promise<void> {
  const cache = await loadCache();
  const dirs = detectSessionDirs();
  let uploaded = 0;
  let skipped = 0;

  for (const { tool, dir } of dirs) {
    const files = await collectSessionFiles(dir);
    for (const filePath of files) {
      try {
        const info = await stat(filePath);
        if (!info.isFile()) continue;

        const raw = await readFile(filePath);
        const contentHash = createHash('sha256').update(raw).digest('hex');

        const cached = cache.entries[filePath];
        if (cached?.contentHash === contentHash) { skipped++; continue; }

        const rawText = raw.toString('utf-8');
        const { filtered, redactedCount } = filterSecrets(rawText);
        const truncated = Buffer.byteLength(filtered, 'utf-8') > MAX_CONTENT_BYTES
          ? filtered.slice(0, MAX_CONTENT_BYTES) + '\n[truncated]'
          : filtered;

        const title = extractTitle(rawText, tool, basename(filePath));

        await uploadSession(config, {
          sessionPath: filePath,
          tool,
          title,
          content: truncated,
          contentHash,
          sizeBytes: info.size,
          sessionDate: info.mtime.toISOString(),
        });

        cache.entries[filePath] = { contentHash, uploadedAt: new Date().toISOString() };
        if (redactedCount > 0) {
          console.log(`[companion] session ${basename(filePath)}: ${redactedCount} secret(s) redacted`);
        }
        uploaded++;
      } catch (err) {
        console.error(`[companion] session skip ${filePath}: ${err}`);
        skipped++;
      }
    }
  }

  await saveCache(cache);
  if (uploaded > 0 || skipped > 0) {
    console.log(`[companion] sessions: ${uploaded} uploaded, ${skipped} unchanged`);
  }
}

async function collectSessionFiles(dir: string): Promise<string[]> {
  const results: string[] = [];
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...await collectSessionFiles(full));
      } else if (entry.isFile()) {
        const dot = entry.name.lastIndexOf('.');
        const ext = dot !== -1 ? entry.name.slice(dot).toLowerCase() : '';
        if (SESSION_EXTENSIONS.has(ext)) results.push(full);
      }
    }
  } catch { /* dir doesn't exist or no permission */ }
  return results;
}
