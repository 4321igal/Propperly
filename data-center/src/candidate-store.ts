import { appendRecord, readRecords } from '../../storage/src/append-store.js';
import { candidateEvidenceFile, selectionDecisionsFile } from './paths.js';
import type {
  WorkspaceId,
  RunId,
  CandidateEvidenceRecord,
  SelectionDecisionRecord,
} from '../../app/src/domain/types.js';

export async function appendCandidateEvidence(
  workspaceId: WorkspaceId,
  runId: RunId,
  evidence: CandidateEvidenceRecord,
): Promise<void> {
  await appendRecord(candidateEvidenceFile(workspaceId, runId), evidence);
}

export async function readCandidateEvidence(
  workspaceId: WorkspaceId,
  runId: RunId,
): Promise<CandidateEvidenceRecord[]> {
  return readRecords<CandidateEvidenceRecord>(candidateEvidenceFile(workspaceId, runId));
}

export async function appendSelectionDecision(
  workspaceId: WorkspaceId,
  runId: RunId,
  decision: SelectionDecisionRecord,
): Promise<void> {
  await appendRecord(selectionDecisionsFile(workspaceId, runId), decision);
}

export async function readSelectionDecisions(
  workspaceId: WorkspaceId,
  runId: RunId,
): Promise<SelectionDecisionRecord[]> {
  return readRecords<SelectionDecisionRecord>(selectionDecisionsFile(workspaceId, runId));
}
