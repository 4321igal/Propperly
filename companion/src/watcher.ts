import { readFile, stat } from 'node:fs/promises';
import { relative, basename } from 'node:path';
import { createHash } from 'node:crypto';
import chokidar from 'chokidar';
import type { CompanionConfig } from './config.js';
import { uploadFile, deleteFile } from './uploader.js';
import { SKIP_EXTENSIONS, SKIP_DIRS, detectMimeType, isBinaryBuffer } from './utils.js';

export function startWatcher(config: CompanionConfig): void {
  const maxBytes = config.maxFileSizeMb * 1024 * 1024;

  // Build ignored pattern from SKIP_DIRS
  const ignoredDirs = [...SKIP_DIRS].join('|');
  const ignoredPattern = new RegExp(`[\\\\/](${ignoredDirs})[\\\\/]`);

  const watcher = chokidar.watch(config.folders, {
    ignored: [ignoredPattern, /(^|[/\\])\../], // also skip dotfiles
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 500, pollInterval: 100 },
  });

  watcher.on('add', (path) => void handleUpsert(path, config, maxBytes, 'add'));
  watcher.on('change', (path) => void handleUpsert(path, config, maxBytes, 'change'));
  watcher.on('unlink', (path) => {
    void deleteFile(config, path);
    console.log(`[companion] deleted: ${path}`);
  });

  watcher.on('error', (err) => console.error(`[companion] watcher error: ${err}`));

  console.log('[companion] watching for changes...');
}

async function handleUpsert(
  filePath: string,
  config: CompanionConfig,
  maxBytes: number,
  event: string
): Promise<void> {
  const dot = filePath.lastIndexOf('.');
  const ext = dot !== -1 ? filePath.slice(dot).toLowerCase() : '';
  if (SKIP_EXTENSIONS.has(ext)) return;

  try {
    const info = await stat(filePath);
    if (!info.isFile() || info.size > maxBytes) return;

    const raw = await readFile(filePath);
    if (isBinaryBuffer(raw)) return;

    const content = raw.toString('base64');
    const contentHash = createHash('sha256').update(raw).digest('hex');
    const name = basename(filePath);

    const rootFolder = config.folders.find((f) => filePath.startsWith(f)) ?? config.folders[0];

    await uploadFile(config, {
      absolutePath: filePath,
      relativePath: relative(rootFolder, filePath),
      name,
      sizeBytes: info.size,
      mimeType: detectMimeType(name),
      contentHash,
      content,
    });
    console.log(`[companion] ${event}: ${filePath}`);
  } catch (err) {
    console.error(`[companion] error on ${event} ${filePath}: ${err}`);
  }
}
