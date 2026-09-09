import express from 'express';
import { registerDiscoveryRoutes } from '../discovery/routes/index.js';

const PORT = Number(process.env.PORT) || 3001;
const CWD = process.env.PROPPERLY_CWD || process.cwd();

const app = express();
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'propperly-services', cwd: CWD });
});

registerDiscoveryRoutes(app, CWD);

app.listen(PORT, () => {
  console.log(`[services] listening on port ${PORT}`);
  console.log(`[services] workspace cwd: ${CWD}`);
});
