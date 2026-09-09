import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

async function ensureDir(filePath: string): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

export async function appendRecord(filePath: string, record: object): Promise<void> {
  await ensureDir(filePath);
  const line = JSON.stringify(record) + '\n';
  await fs.appendFile(filePath, line, 'utf8');
}

export async function readRecords<T>(filePath: string): Promise<T[]> {
  let content: string;
  try {
    content = await fs.readFile(filePath, 'utf8');
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw err;
  }
  return content
    .split('\n')
    .filter(line => line.trim().length > 0)
    .map(line => JSON.parse(line) as T);
}

export async function atomicWrite(filePath: string, data: object): Promise<void> {
  await ensureDir(filePath);
  const tmp = filePath + '.tmp.' + process.pid + '.' + Date.now();
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), 'utf8');
  await fs.rename(tmp, filePath);
}

export async function readDocument<T>(filePath: string): Promise<T | null> {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return JSON.parse(content) as T;
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw err;
  }
}

export function propperlyDataDir(): string {
  return path.join(os.homedir(), '.propperly');
}
