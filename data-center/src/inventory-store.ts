import { appendRecord, readRecords, atomicWrite, readDocument } from '../../storage/src/append-store.js';
import { confirmedInventoryFile, confirmationLogFile } from './paths.js';
import type { WorkspaceId, SourceInventory, ConfirmationReceipt } from '../../app/src/domain/types.js';

export async function appendConfirmationReceipt(
  workspaceId: WorkspaceId,
  receipt: ConfirmationReceipt,
): Promise<void> {
  await appendRecord(confirmationLogFile(workspaceId), receipt);
}

export async function readConfirmationByRequestId(
  workspaceId: WorkspaceId,
  requestId: string,
): Promise<ConfirmationReceipt | null> {
  const receipts = await readRecords<ConfirmationReceipt>(confirmationLogFile(workspaceId));
  return receipts.find(r => r.requestId === requestId) ?? null;
}

export async function persistApprovedInventory(
  workspaceId: WorkspaceId,
  inventory: SourceInventory,
): Promise<void> {
  await atomicWrite(confirmedInventoryFile(workspaceId), inventory);
}

export async function readApprovedInventory(workspaceId: WorkspaceId): Promise<SourceInventory | null> {
  return readDocument<SourceInventory>(confirmedInventoryFile(workspaceId));
}
