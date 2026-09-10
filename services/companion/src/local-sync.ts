import { readFile, stat } from 'node:fs/promises';
import { basename, relative } from 'node:path';
import chokidar from 'chokidar';
import { filterSecrets } from './secrets.js';
import type { UploadClient } from './upload.js';

const MAX_BYTES = 10 * 1024 * 1024;

const SKIP_DIRS = new Set([
  'node_modules', '.git', '.svn', 'dist', 'build', '.next', '.nuxt',
  '__pycache__', 'vendor', '.venv', 'venv', 'target',
]);

const TEXT_EXTS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.py', '.rb', '.go', '.rs', '.java', '.cs', '.cpp', '.c', '.h', '.hpp',
  '.json', '.yaml', '.yml', '.toml', '.ini', '.cfg',
  '.md', '.txt', '.csv', '.html', '.css', '.scss', '.sass', '.less',
  '.sh', '.bash', '.zsh', '.ps1', '.bat', '.cmd',
  '.sql', '.graphql', '.proto', '.tf', '.hcl',
  '.env', '.env.example',
]);

function isTextFile(name: string): boolean {
  const dot = name.lastIndexOf('.');
  return dot !== -1 && TEXT_EXTS.has(name.slice(dot).toLowerCase());
}

function hasSKipSegment(filePath: string): boolean {
  return filePath.split(/[/\\]/).some(p => SKIP_DIRS.has(p));
}

async function uploadOne(client: UploadClient, absolutePath: string, watchRoot: string): Promise<void> {
  if (hasSKipSegment(absolutePath)) return;
  const name = basename(absolutePath);
  if (!isTextFile(name)) return;

  let info: Awaited<ReturnType<typeof stat>>;
  try { info = await stat(absolutePath); } catch { return; }
  if (!info.isFile() || info.size > MAX_BYTES || info.size === 0) return;

  const raw = await readFile(absolutePath);
  if (raw.includes(0)) return; // binary guard

  const { text, redactedCount } = filterSecrets(raw.toString('utf-8'));
  if (redactedCount > 0) {
    console.log(`[local] redacted ${redactedCount} secret(s) in ${name}`);
  }

  const relativePath = relative(watchRoot, absolutePath).replace(/\\/g, '/');
  await client.uploadFile({ absolutePath, relativePath, name, content: Buffer.from(text, 'utf-8') });
}

export function watchFolder(folder: string, client: UploadClient): void {
  const watcher = chokidar.watch(folder, {
    ignored: (p: string) => hasSKipSegment(p),
    ignoreInitial: false,
    persistent: true,
    awaitWriteFinish: { stabilityThreshold: 500, pollInterval: 100 },
  });

  watcher
    .on('add', path => {
      uploadOne(client, path, folder).catch(err =>
        console.error(`[local] add error ${basename(path)}: ${(err as Error).message}`),
      );
    })
    .on('change', path => {
      uploadOne(client, path, folder).catch(err =>
        console.error(`[local] change error ${basename(path)}: ${(err as Error).message}`),
      );
    })
    .on('unlink', path => {
      client.deleteFile(path).catch(err =>
        console.error(`[local] delete error ${basename(path)}: ${(err as Error).message}`),
      );
    })
    .on('error', err => console.error('[local] watcher error:', (err as Error).message));

  console.log(`[local] watching ${folder}`);
}
