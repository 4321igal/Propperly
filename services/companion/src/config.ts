import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';

export interface CompanionConfig {
  serverUrl: string;
  token: string;
  watchFolders: string[];
  sessionDirs: string[];
}

const CONFIG_DIR = join(homedir(), '.propperly');
const CONFIG_FILE = join(CONFIG_DIR, 'companion.json');

export function defaultSessionDirs(): string[] {
  const home = homedir();
  const dirs: string[] = [join(home, '.claude', 'projects')];
  if (process.platform === 'win32') {
    const appData = process.env['APPDATA'];
    if (appData) dirs.push(join(appData, 'Claude'));
  }
  return dirs;
}

export async function loadConfig(): Promise<CompanionConfig> {
  try {
    const raw = await readFile(CONFIG_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<CompanionConfig>;
    return {
      serverUrl: parsed.serverUrl ?? 'http://localhost:3001',
      token: parsed.token ?? '',
      watchFolders: parsed.watchFolders ?? [],
      sessionDirs: parsed.sessionDirs ?? defaultSessionDirs(),
    };
  } catch {
    throw new Error(
      `Config not found at ${CONFIG_FILE}.\nRun "npm run setup" or "npm start -- --setup" to configure.`,
    );
  }
}

export async function saveConfig(config: CompanionConfig): Promise<void> {
  await mkdir(CONFIG_DIR, { recursive: true });
  await writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
  console.log(`Config saved to ${CONFIG_FILE}`);
}
