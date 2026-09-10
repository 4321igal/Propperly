import { readFile, readdir, stat } from 'node:fs/promises';
import { join, basename } from 'node:path';
import chokidar from 'chokidar';
import { filterSecrets } from './secrets.js';
import type { UploadClient } from './upload.js';

const SESSION_EXTS = new Set(['.md', '.jsonl', '.txt']);
const MAX_SESSION_BYTES = 50_000;

type AITool = 'claude-code' | 'cursor' | 'vscode' | 'other';

function detectTool(sessionPath: string): AITool {
  const lower = sessionPath.toLowerCase().replace(/\\/g, '/');
  if (lower.includes('/.claude/') || lower.includes('/claude/')) return 'claude-code';
  if (lower.includes('/cursor/') || lower.includes('cursor')) return 'cursor';
  if (lower.includes('/vscode/') || lower.includes('.vscode')) return 'vscode';
  return 'other';
}

function extractTitle(content: string, filePath: string): string {
  const m = content.match(/^#{1,3} (.+)$/m);
  return m ? m[1].trim().slice(0, 200) : basename(filePath);
}

function hasSessionExt(filePath: string): boolean {
  const dot = filePath.lastIndexOf('.');
  return dot !== -1 && SESSION_EXTS.has(filePath.slice(dot).toLowerCase());
}

async function uploadSession(client: UploadClient, sessionPath: string): Promise<void> {
  let info: Awaited<ReturnType<typeof stat>>;
  try { info = await stat(sessionPath); } catch { return; }
  if (!info.isFile() || !hasSessionExt(sessionPath)) return;

  const raw = await readFile(sessionPath, 'utf-8').catch(() => null);
  if (!raw) return;

  const truncated = raw.slice(0, MAX_SESSION_BYTES);
  const { text } = filterSecrets(truncated);

  await client.uploadSession({
    sessionPath,
    tool: detectTool(sessionPath),
    title: extractTitle(text, sessionPath),
    content: text,
    sessionDate: info.mtime,
  });

  console.log(`[sessions] synced ${basename(sessionPath)}`);
}

async function scanDir(dir: string, client: UploadClient): Promise<void> {
  let entries: string[];
  try { entries = await readdir(dir); } catch { return; }

  for (const entry of entries) {
    const full = join(dir, entry);
    let info: Awaited<ReturnType<typeof stat>>;
    try { info = await stat(full); } catch { continue; }

    if (info.isDirectory()) {
      await scanDir(full, client);
    } else if (hasSessionExt(entry)) {
      await uploadSession(client, full).catch(err =>
        console.error(`[sessions] error ${entry}: ${(err as Error).message}`),
      );
    }
  }
}

export async function syncSessionsOnce(dirs: string[], client: UploadClient): Promise<void> {
  for (const dir of dirs) {
    await scanDir(dir, client);
  }
}

export function watchSessions(dirs: string[], client: UploadClient): void {
  for (const dir of dirs) {
    const watcher = chokidar.watch(dir, {
      ignoreInitial: true,
      persistent: true,
      awaitWriteFinish: { stabilityThreshold: 1000, pollInterval: 200 },
    });

    watcher
      .on('add', path => {
        uploadSession(client, path).catch(err =>
          console.error(`[sessions] add error ${basename(path)}: ${(err as Error).message}`),
        );
      })
      .on('change', path => {
        uploadSession(client, path).catch(err =>
          console.error(`[sessions] change error ${basename(path)}: ${(err as Error).message}`),
        );
      })
      .on('error', err => console.error('[sessions] watcher error:', (err as Error).message));

    console.log(`[sessions] watching ${dir}`);
  }
}
