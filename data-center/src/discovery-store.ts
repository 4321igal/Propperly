import fs from 'node:fs/promises';
import path from 'node:path';
import { atomicWrite, readDocument } from '../../storage/src/append-store.js';
import { runFile, workspaceDir } from './paths.js';
import type { DiscoveryRun, WorkspaceId, RunId, RunStatus } from '../../app/src/domain/types.js';

export async function persistDiscoveryRun(workspaceId: WorkspaceId, run: DiscoveryRun): Promise<void> {
  await atomicWrite(runFile(workspaceId, run.id), run);
}

export async function updateRunStatus(
  workspaceId: WorkspaceId,
  runId: RunId,
  status: RunStatus,
  endedAt?: string,
): Promise<void> {
  const existing = await readDocument<DiscoveryRun>(runFile(workspaceId, runId));
  if (!existing) throw new Error(`Run ${runId} not found`);
  await atomicWrite(runFile(workspaceId, runId), {
    ...existing,
    status,
    ...(endedAt ? { endedAt } : {}),
  });
}

export async function readDiscoveryRun(workspaceId: WorkspaceId, runId: RunId): Promise<DiscoveryRun | null> {
  return readDocument<DiscoveryRun>(runFile(workspaceId, runId));
}

export async function readActiveRunForWorkspace(workspaceId: WorkspaceId): Promise<DiscoveryRun | null> {
  const runsBase = path.join(workspaceDir(workspaceId), 'discovery-runs');
  let entries: string[];
  try {
    entries = await fs.readdir(runsBase);
  } catch {
    return null;
  }
  for (const entry of entries.reverse()) {
    const run = await readDocument<DiscoveryRun>(path.join(runsBase, entry, 'run.json'));
    if (run && (run.status === 'RUNNING' || run.status === 'INTERRUPTED')) return run;
  }
  return null;
}
