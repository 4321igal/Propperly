import { createInterface } from 'node:readline';
import { loadConfig, saveConfig, defaultSessionDirs, type CompanionConfig } from './config.js';
import { createUploadClient } from './upload.js';
import { watchFolder } from './local-sync.js';
import { syncSessionsOnce, watchSessions } from './session-sync.js';

async function ask(rl: ReturnType<typeof createInterface>, question: string): Promise<string> {
  return new Promise(resolve => rl.question(question, resolve));
}

async function setup(): Promise<void> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  console.log('\nPropperly Companion Setup\n');

  const serverUrl = (await ask(rl, 'Services URL [http://localhost:3001]: ')).trim() || 'http://localhost:3001';
  const token = (await ask(rl, 'Bearer token (from /oauth/google/callback or /oauth/github/callback): ')).trim();
  const folderInput = (await ask(rl, 'Local folders to watch (comma-separated, leave empty to skip): ')).trim();

  rl.close();

  const watchFolders = folderInput ? folderInput.split(',').map(f => f.trim()).filter(Boolean) : [];

  const config: CompanionConfig = {
    serverUrl,
    token,
    watchFolders,
    sessionDirs: defaultSessionDirs(),
  };

  await saveConfig(config);
  console.log('\nDone. Run "npm start" to begin syncing.');
}

async function run(): Promise<void> {
  const config = await loadConfig();

  if (!config.token) {
    console.error('token is missing in config. Run --setup to configure.');
    process.exit(1);
  }

  // Verify server reachability
  try {
    const res = await fetch(`${config.serverUrl}/health`);
    const json = await res.json() as { status?: string };
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    console.log(`[companion] connected to ${config.serverUrl} (${json.status})`);
  } catch (err) {
    console.error(`[companion] cannot reach ${config.serverUrl}: ${(err as Error).message}`);
    process.exit(1);
  }

  const client = createUploadClient(config.serverUrl, config.token);
  const sessionDirs = config.sessionDirs.length > 0 ? config.sessionDirs : defaultSessionDirs();

  // Initial full session sync
  console.log('[companion] initial session sync…');
  await syncSessionsOnce(sessionDirs, client);
  console.log('[companion] initial session sync complete');

  // Start watchers
  for (const folder of config.watchFolders) {
    watchFolder(folder, client);
  }
  watchSessions(sessionDirs, client);

  if (config.watchFolders.length === 0) {
    console.log('[companion] no local folders configured — only sessions are synced');
    console.log('[companion] run --setup to add folders, or edit ~/.propperly/companion.json');
  }

  console.log('[companion] running. Press Ctrl+C to stop.');
}

const args = process.argv.slice(2);
if (args.includes('--setup')) {
  setup().catch(err => { console.error(err); process.exit(1); });
} else {
  run().catch(err => { console.error(err); process.exit(1); });
}
