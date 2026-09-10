import { writeFile, readFile, unlink, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { safeStoragePath } from '../security/path-guard.js';

// Phase 3: local disk storage. Phase 5+ can swap in an S3 driver behind this interface.
const uploadsDir = () => process.env.UPLOADS_DIR ?? './uploads';

export async function storeContent(storageKey: string, content: Buffer): Promise<void> {
  const dest = safeStoragePath(uploadsDir(), storageKey);
  await mkdir(dirname(dest), { recursive: true });
  await writeFile(dest, content);
}

export async function readContent(storageKey: string): Promise<Buffer> {
  return readFile(safeStoragePath(uploadsDir(), storageKey));
}

export async function removeContent(storageKey: string): Promise<void> {
  await unlink(safeStoragePath(uploadsDir(), storageKey)).catch(() => {
    // file may already be gone
  });
}
