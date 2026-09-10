import express from 'express';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import helmet from 'helmet';
import { registerDiscoveryRoutes } from '../discovery/routes/index.js';
import { registerDriveRoutes } from '../drive/routes/index.js';
import { registerGitRoutes } from '../git/routes/index.js';
import { registerLocalRoutes } from '../local/routes/index.js';
import { registerSessionRoutes } from '../sessions/routes/index.js';
import { oauthLimiter, uploadLimiter, globalLimiter } from '../security/rate-limit.js';

const PORT = Number(process.env.PORT) || 3001;
const CWD = process.env.PROPPERLY_CWD || process.cwd();
const publicDir = fileURLToPath(new URL('../public', import.meta.url));

const app = express();

// Security headers
app.use(helmet({ contentSecurityPolicy: false })); // CSP off — API server, no HTML responses

// Body parsing — 12mb limit for base64 file uploads from companion (max decoded ~8MB)
app.use(express.json({ limit: '12mb' }));

// Global rate limit (safety net)
app.use(globalLimiter);

app.use(express.static(publicDir));
app.get('/', (_req, res) => res.sendFile(join(publicDir, 'index.html')));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'propperly-services', cwd: CWD });
});

// Tighter rate limit on public OAuth endpoints
app.use('/oauth', oauthLimiter);

// Tighter rate limit on companion upload endpoints
app.use('/api/local/files', uploadLimiter);
app.use('/api/sessions', uploadLimiter);

registerDiscoveryRoutes(app, CWD);
registerDriveRoutes(app);
registerGitRoutes(app);
registerLocalRoutes(app);
registerSessionRoutes(app);

app.listen(PORT, () => {
  console.log(`[services] listening on port ${PORT}`);
  console.log(`[services] workspace cwd: ${CWD}`);
});
