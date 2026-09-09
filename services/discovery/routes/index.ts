import type { Express, Request, Response } from 'express';
import {
  beginDiscoveryRun,
  getRunView,
  recordSelection,
  resolveIdentityConflict,
  addCandidate,
  getIncludedRefs,
} from '../discovery/index.js';
import {
  confirmInventory,
  getWorkspaceInventoryView,
  StaleInventoryError,
  StaleReviewError,
} from '../approval/index.js';
import {
  findWorkspaceByCwd,
  persistWorkspace,
  readWorkspace,
} from '../../../data-center/src/workspace-store.js';
import { readApprovedInventory } from '../../../data-center/src/inventory-store.js';
import { randomUUID } from 'node:crypto';
import type { Workspace } from '../../../app/src/domain/types.js';

// In-memory cache of the service workspace (Stage 1: single-workspace assumption)
let _workspaceId: string | null = null;

async function getOrCreateWorkspace(cwd: string): Promise<string> {
  if (_workspaceId) return _workspaceId;
  const existing = await findWorkspaceByCwd(cwd);
  if (existing) { _workspaceId = existing.id; return existing.id; }
  const ws: Workspace = {
    id: randomUUID(),
    state: 'NEW',
    cwd,
    createdAt: new Date().toISOString(),
  };
  await persistWorkspace(ws);
  _workspaceId = ws.id;
  return ws.id;
}

export function registerDiscoveryRoutes(app: Express, cwd: string): void {
  // R-1 — workspace state
  app.get('/api/discovery/workspace', async (_req: Request, res: Response) => {
    try {
      const workspaceId = await getOrCreateWorkspace(cwd);
      const inventory = await readApprovedInventory(workspaceId);
      const workspace = await readWorkspace(workspaceId);
      res.json({
        workspace_id: workspaceId,
        has_approved_inventory: inventory !== null,
        state: workspace?.state ?? 'NEW',
      });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // R-3 — start discovery run
  app.post('/api/discovery/runs', async (req: Request, res: Response) => {
    try {
      const workspaceId = await getOrCreateWorkspace(cwd);
      const policy = req.body?.policy;
      const result = await beginDiscoveryRun(workspaceId, cwd, policy);
      res.status(201).json(result);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // R-3 — get discovery run (includes candidates)
  app.get('/api/discovery/runs/:runId', async (req: Request, res: Response) => {
    try {
      const workspaceId = await getOrCreateWorkspace(cwd);
      const view = await getRunView(workspaceId, req.params.runId);
      if (!view) return void res.status(404).json({ error: 'Run not found' });
      res.json(view);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // R-3 — record candidate selection
  app.post('/api/discovery/runs/:runId/selections', async (req: Request, res: Response) => {
    try {
      const workspaceId = await getOrCreateWorkspace(cwd);
      const { candidate_ref, selection } = req.body as { candidate_ref: string; selection: 'INCLUDED' | 'EXCLUDED' };
      if (!candidate_ref || !selection) return void res.status(400).json({ error: 'candidate_ref and selection required' });
      await recordSelection(workspaceId, req.params.runId, candidate_ref, selection);
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // R-3 — resolve identity conflict
  app.post('/api/discovery/runs/:runId/identity', async (req: Request, res: Response) => {
    try {
      const workspaceId = await getOrCreateWorkspace(cwd);
      const { refs, relation } = req.body as { refs: string[]; relation: 'SAME' | 'DIFFERENT' };
      if (!refs || !relation) return void res.status(400).json({ error: 'refs and relation required' });
      await resolveIdentityConflict(workspaceId, req.params.runId, refs, relation);
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // R-3 — add candidate by path
  app.post('/api/discovery/runs/:runId/candidates', async (req: Request, res: Response) => {
    try {
      const workspaceId = await getOrCreateWorkspace(cwd);
      const { path: locator, kind } = req.body as { path: string; kind: 'GIT_REPO' | 'FOLDER' | 'UNKNOWN' };
      if (!locator) return void res.status(400).json({ error: 'path required' });
      await addCandidate(workspaceId, req.params.runId, locator, kind ?? 'UNKNOWN');
      res.status(201).send();
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // R-4 — get proposed inventory
  app.get('/api/discovery/runs/:runId/proposed-inventory', async (req: Request, res: Response) => {
    try {
      const workspaceId = await getOrCreateWorkspace(cwd);
      const view = await getWorkspaceInventoryView(workspaceId, req.params.runId);
      res.json(view);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // R-4 — confirm source inventory
  app.post('/api/discovery/inventory/confirm', async (req: Request, res: Response) => {
    try {
      const workspaceId = await getOrCreateWorkspace(cwd);
      const body = req.body as {
        run_id: string;
        refs: string[];
        expected_inventory_version: number;
        expected_review_revision: string;
        request_id: string;
      };
      if (!body.run_id || !body.refs || !body.request_id) {
        return void res.status(400).json({ error: 'run_id, refs, and request_id required' });
      }
      const receipt = await confirmInventory({
        workspaceId,
        runId: body.run_id,
        refs: body.refs,
        expectedInventoryVersion: body.expected_inventory_version ?? 0,
        expectedReviewRevision: body.expected_review_revision ?? '',
        requestId: body.request_id,
      });
      res.json(receipt);
    } catch (err) {
      if (err instanceof StaleInventoryError || err instanceof StaleReviewError) {
        return void res.status(409).json({ error: err.message, code: err.name });
      }
      res.status(500).json({ error: String(err) });
    }
  });
}
