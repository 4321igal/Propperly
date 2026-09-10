import { loadConfig } from './config.js';
import { scanAndUpload } from './scanner.js';
import { startWatcher } from './watcher.js';
import { scanSessions } from './session-scanner.js';

const config = await loadConfig();

console.log(`[companion] userId: ${config.userId}`);
console.log(`[companion] servicesUrl: ${config.servicesUrl}`);
console.log(`[companion] watching folders:`);
config.folders.forEach((f) => console.log(`  - ${f}`));
console.log(`[companion] maxFileSizeMb: ${config.maxFileSizeMb}`);

// Initial scan: regular files + session logs
await scanAndUpload(config);
await scanSessions(config);

// Watch for changes in regular folders
startWatcher(config);
