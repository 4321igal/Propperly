import path from 'node:path';
import { propperlyDataDir } from '../../storage/src/append-store.js';
import type { WorkspaceId, RunId } from '../../app/src/domain/types.js';

export function workspaceDir(workspaceId: WorkspaceId): string {
  return path.join(propperlyDataDir(), 'workspaces', workspaceId);
}

export function workspaceFile(workspaceId: WorkspaceId): string {
  return path.join(workspaceDir(workspaceId), 'workspace.json');
}

export function runDir(workspaceId: WorkspaceId, runId: RunId): string {
  return path.join(workspaceDir(workspaceId), 'discovery-runs', runId);
}

export function runFile(workspaceId: WorkspaceId, runId: RunId): string {
  return path.join(runDir(workspaceId, runId), 'run.json');
}

export function candidateEvidenceFile(workspaceId: WorkspaceId, runId: RunId): string {
  return path.join(runDir(workspaceId, runId), 'candidate-evidence.ndjson');
}

export function selectionDecisionsFile(workspaceId: WorkspaceId, runId: RunId): string {
  return path.join(runDir(workspaceId, runId), 'selection-decisions.ndjson');
}

export function inventoryDir(workspaceId: WorkspaceId): string {
  return path.join(workspaceDir(workspaceId), 'inventory');
}

export function confirmedInventoryFile(workspaceId: WorkspaceId): string {
  return path.join(inventoryDir(workspaceId), 'confirmed.json');
}

export function confirmationLogFile(workspaceId: WorkspaceId): string {
  return path.join(inventoryDir(workspaceId), 'confirmation-log.ndjson');
}

export function workspacesIndexFile(): string {
  return path.join(propperlyDataDir(), 'workspaces-index.ndjson');
}
