import { resolve, join, sep } from 'node:path';

// Resolves storageKey within baseDir and throws if the result escapes the base.
export function safeStoragePath(baseDir: string, storageKey: string): string {
  assertStorageKey(storageKey);
  const base = resolve(baseDir);
  const dest = resolve(join(base, storageKey));
  if (dest !== base && !dest.startsWith(base + sep)) {
    throw new Error('storage path traversal detected');
  }
  return dest;
}

// storageKey must be exactly {userId}/{uuid} — two segments, safe chars only.
export function assertStorageKey(key: string): void {
  if (!/^[\w\-]{1,200}\/[\w\-]{1,200}$/.test(key)) {
    throw new Error('invalid storage key format');
  }
}

// Rejects null bytes and .. traversal sequences in any file path.
export function assertSafePath(value: unknown, label: string): asserts value is string {
  if (!value || typeof value !== 'string') throw new Error(`${label} is required`);
  if (value.includes('\x00')) throw new Error(`${label}: null bytes not allowed`);
  if (/(^|[/\\])\.\.([/\\]|$)/.test(value)) throw new Error(`${label}: path traversal not allowed`);
  if (value.length > 4096) throw new Error(`${label}: path too long`);
}

// GitHub / filesystem owner and repo names: alphanumeric plus .-_
export function assertGitRef(value: unknown, label: string): asserts value is string {
  if (!value || typeof value !== 'string') throw new Error(`${label} is required`);
  if (!/^[A-Za-z0-9_.\-]{1,100}$/.test(value)) {
    throw new Error(`${label}: invalid characters (got "${value}")`);
  }
}

// Ensures a string is non-empty and within a max byte length.
export function assertStringParam(value: unknown, label: string, maxLen = 1000): asserts value is string {
  if (!value || typeof value !== 'string') throw new Error(`${label} is required`);
  if (Buffer.byteLength(value, 'utf-8') > maxLen) throw new Error(`${label}: too long`);
}
