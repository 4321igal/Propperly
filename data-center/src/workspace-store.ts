import { appendRecord, readRecords, atomicWrite, readDocument } from '../../storage/src/append-store.js';
import { workspaceFile, workspacesIndexFile } from './paths.js';
import type { Workspace, WorkspaceId, WorkspaceState, RunId } from '../../app/src/domain/types.js';

interface WorkspaceIndexEntry {
  id: WorkspaceId;
  cwd: string;
}

export async function persistWorkspace(workspace: Workspace): Promise<void> {
  await atomicWrite(workspaceFile(workspace.id), workspace);
  await appendRecord(workspacesIndexFile(), { id: workspace.id, cwd: workspace.cwd } satisfies WorkspaceIndexEntry);
}

export async function readWorkspace(id: WorkspaceId): Promise<Workspace | null> {
  return readDocument<Workspace>(workspaceFile(id));
}

export async function updateWorkspaceState(
  id: WorkspaceId,
  state: WorkspaceState,
  activeRunId?: RunId | null,
): Promise<void> {
  const existing = await readDocument<Workspace>(workspaceFile(id));
  if (!existing) throw new Error(`Workspace ${id} not found`);
  const updated: Workspace = { ...existing, state };
  if (activeRunId !== undefined) {
    if (activeRunId === null) {
      delete updated.activeRunId;
    } else {
      updated.activeRunId = activeRunId;
    }
  }
  await atomicWrite(workspaceFile(id), updated);
}

export async function findWorkspaceByCwd(cwd: string): Promise<Workspace | null> {
  const entries = await readRecords<WorkspaceIndexEntry>(workspacesIndexFile());
  const match = [...entries].reverse().find(e => e.cwd === cwd);
  if (!match) return null;
  return readDocument<Workspace>(workspaceFile(match.id));
}
