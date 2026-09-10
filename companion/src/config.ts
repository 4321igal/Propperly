import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

export interface CompanionConfig {
  userId: string;
  token: string;
  servicesUrl: string;
  folders: string[];
  maxFileSizeMb: number;
}

const CONFIG_DIR = join(homedir(), '.propperly');
export const CONFIG_PATH = join(CONFIG_DIR, 'companion.json');

const EXAMPLE: CompanionConfig = {
  userId: 'your-user-id-from-oauth',
  token: 'your-jwt-token-from-oauth-callback',
  servicesUrl: 'http://localhost:3001',
  folders: [join(homedir(), 'Documents')],
  maxFileSizeMb: 5,
};

export async function loadConfig(): Promise<CompanionConfig> {
  try {
    const raw = await readFile(CONFIG_PATH, 'utf-8');
    const cfg = JSON.parse(raw) as CompanionConfig;
    if (!cfg.userId || !cfg.token || !cfg.folders?.length) {
      throw new Error('config is missing required fields');
    }
    return cfg;
  } catch (err) {
    console.error(`[companion] Cannot load config from ${CONFIG_PATH}: ${err}`);
    console.error('[companion] Create the config file with the following content:');
    console.error(JSON.stringify(EXAMPLE, null, 2));
    console.error('[companion] Get userId and token from: GET /oauth/google/authorize or GET /oauth/github/authorize');
    process.exit(1);
  }
}

export async function saveConfig(cfg: CompanionConfig): Promise<void> {
  await mkdir(CONFIG_DIR, { recursive: true });
  await writeFile(CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf-8');
}
