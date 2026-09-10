import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative, basename } from 'node:path';
import { createHash } from 'node:crypto';
import type { CompanionConfig } from './config.js';
import { uploadFile } from './uploader.js';
import { SKIP_EXTENSIONS, SKIP_DIRS, detectMimeType, isBinaryBuffer } from './utils.js';

export async function scanAndUpload(config: CompanionConfig): Promise<void> {
  const maxBytes = config.maxFileSizeMb * 1024 * 1024;
  let uploaded = 0;
  let skipped = 0;

  for (const folder of config.folders) {
    console.log(`[companion] scanning ${folder}`);
    const counts = await walkDir(folder, folder, maxBytes, config);
    uploaded += counts.uploaded;
    skipped += counts.skipped;
  }

  console.log(`[companion] initial scan done — ${uploaded} uploaded, ${skipped} skipped`);
}

async function walkDir(
  rootFolder: string,
  dir: string,
  maxBytes: number,
  config: CompanionConfig
): Promise<{ uploaded: number; skipped: number }> {
  let uploaded = 0;
  let skipped = 0;

  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return { uploaded, skipped };
  }

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name) && !entry.name.startsWith('.')) {
        const sub = await walkDir(rootFolder, fullPath, maxBytes, config);
        uploaded += sub.uploaded;
        skipped += sub.skipped;
      }
      continue;
    }

    if (!entry.isFile()) continue;

    const dot = entry.name.lastIndexOf('.');
    const ext = dot !== -1 ? entry.name.slice(dot).toLowerCase() : '';
    if (SKIP_EXTENSIONS.has(ext)) { skipped++; continue; }

    try {
      const info = await stat(fullPath);
      if (info.size > maxBytes) { skipped++; continue; }

      const raw = await readFile(fullPath);
      if (isBinaryBuffer(raw)) { skipped++; continue; }

      const content = raw.toString('base64');
      const contentHash = createHash('sha256').update(raw).digest('hex');

      await uploadFile(config, {
        absolutePath: fullPath,
        relativePath: relative(rootFolder, fullPath),
        name: basename(fullPath),
        sizeBytes: info.size,
        mimeType: detectMimeType(entry.name),
        contentHash,
        content,
      });
      uploaded++;
    } catch (err) {
      console.error(`[companion] skip ${fullPath}: ${err}`);
      skipped++;
    }
  }

  return { uploaded, skipped };
}
