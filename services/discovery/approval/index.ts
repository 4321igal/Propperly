import { randomUUID } from 'node:crypto';
import { createHash } from 'node:crypto';
import {
  appendConfirmationReceipt,
  readConfirmationByRequestId,
  persistApprovedInventory,
  readApprovedInventory,
} from '../../../data-center/src/inventory-store.js';
import { updateWorkspaceState } from '../../../data-center/src/workspace-store.js';
import {
  readCandidateEvidence,
  readSelectionDecisions,
} from '../../../data-center/src/candidate-store.js';
import { computeReviewRevision } from './revision.js';
import { projectCandidate } from '../discovery/projection.js';
import type {
  WorkspaceId,
  SourceInventory,
  Source,
  ConfirmationReceipt,
  CandidateEvidenceRecord,
  SourceCandidateProjection,
} from '../../../app/src/domain/types.js';

export type { ConfirmationReceipt };

export interface ProposedInventoryView {
  run_id: string;
  included_refs: string[];
  current_inventory_version: number;
  review_revision: string;
}

export class StaleInventoryError extends Error {
  constructor(expected: number, actual: number) {
    super(`Stale inventory version: expected ${expected}, actual ${actual}`);
    this.name = 'StaleInventoryError';
  }
}

export class StaleReviewError extends Error {
  constructor() {
    super('Stale review revision: candidates changed since review');
    this.name = 'StaleReviewError';
  }
}

export async function getWorkspaceInventoryView(
  workspaceId: WorkspaceId,
  runId: string,
): Promise<ProposedInventoryView> {
  const evidence = await readCandidateEvidence(workspaceId, runId);
  const decisions = await readSelectionDecisions(workspaceId, runId);
  const projections = buildProjections(evidence, decisions);
  const includedRefs = projections
    .filter(p => p.selection === 'INCLUDED')
    .map(p => `${p.ref.runId}:${p.ref.candidateId}`);

  const current = await readApprovedInventory(workspaceId);
  const reviewRevision = computeReviewRevision(projections);

  return {
    run_id: runId,
    included_refs: includedRefs,
    current_inventory_version: current?.version ?? 0,
    review_revision: reviewRevision,
  };
}

export async function confirmInventory(input: {
  workspaceId: WorkspaceId;
  runId: string;
  refs: string[];
  expectedInventoryVersion: number;
  expectedReviewRevision: string;
  requestId: string;
}): Promise<ConfirmationReceipt> {
  // Idempotency — replay if same requestId already committed
  const existing = await readConfirmationByRequestId(input.workspaceId, input.requestId);
  if (existing) return existing;

  // CAS on inventory version
  const current = await readApprovedInventory(input.workspaceId);
  const currentVersion = current?.version ?? 0;
  if (currentVersion !== input.expectedInventoryVersion) {
    throw new StaleInventoryError(input.expectedInventoryVersion, currentVersion);
  }

  // CAS on review revision
  const evidence = await readCandidateEvidence(input.workspaceId, input.runId);
  const decisions = await readSelectionDecisions(input.workspaceId, input.runId);
  const projections = buildProjections(evidence, decisions);
  const actualRevision = computeReviewRevision(projections);
  if (actualRevision !== input.expectedReviewRevision) {
    throw new StaleReviewError();
  }

  // Build included projections
  const includedIds = new Set(input.refs.map(r => r.split(':').pop()!));
  const included = projections.filter(p => includedIds.has(p.ref.candidateId));

  const sources: Source[] = included.map(p => ({
    id: randomUUID(),
    workspaceId: input.workspaceId,
    locator: p.locator,
    kind: p.kind,
    approvedAt: new Date().toISOString(),
  }));

  const newVersion = currentVersion + 1;
  const head = computeInventoryHead(sources);
  const confirmedAt = new Date().toISOString();

  const inventory: SourceInventory = {
    workspaceId: input.workspaceId,
    version: newVersion,
    head,
    sources,
    confirmedAt,
  };

  const receipt: ConfirmationReceipt = {
    requestId: input.requestId,
    workspaceId: input.workspaceId,
    inventoryVersion: newVersion,
    reviewRevision: actualRevision,
    actorId: 'user',
    timestamp: confirmedAt,
    committedInventory: inventory,
  };

  await persistApprovedInventory(input.workspaceId, inventory);
  await appendConfirmationReceipt(input.workspaceId, receipt);
  await updateWorkspaceState(input.workspaceId, 'INVENTORY_APPROVED');

  return receipt;
}

function buildProjections(
  evidence: CandidateEvidenceRecord[],
  decisions: Parameters<typeof projectCandidate>[1],
): SourceCandidateProjection[] {
  const byCandidate: Record<string, CandidateEvidenceRecord[]> = {};
  for (const e of evidence) {
    (byCandidate[e.candidateId] ??= []).push(e);
  }
  return Object.values(byCandidate).map(evList => projectCandidate(evList, decisions));
}

function computeInventoryHead(sources: Source[]): string {
  const sorted = [...sources].sort((a, b) => a.locator.localeCompare(b.locator));
  const payload = sorted.map(s => `${s.locator}:${s.kind}`).join('|');
  return createHash('sha256').update(payload).digest('hex').slice(0, 16);
}
