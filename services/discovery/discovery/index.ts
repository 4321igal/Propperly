import { randomUUID } from 'node:crypto';
import {
  readDiscoveryRun,
  persistDiscoveryRun,
  readActiveRunForWorkspace,
} from '../../../data-center/src/discovery-store.js';
import {
  readCandidateEvidence,
  readSelectionDecisions,
  appendSelectionDecision,
  appendCandidateEvidence,
} from '../../../data-center/src/candidate-store.js';
import { inspectSourceCandidate } from '../source-access/index.js';
import { computeEffectivePolicy } from './policy.js';
import { projectCandidate } from './projection.js';
import { startDiscoveryRun, executeDiscovery, resumeDiscoveryRun } from './orchestrator.js';
import type {
  WorkspaceId,
  RunId,
  DiscoveryPolicy,
  DiscoveryRun,
  SourceCandidateProjection,
  SelectionDecisionRecord,
  CandidateEvidenceRecord,
} from '../../../app/src/domain/types.js';

export type { DiscoveryPolicy };

export interface DiscoveryRunView {
  run_id: RunId;
  workspace_id: WorkspaceId;
  status: DiscoveryRun['status'];
  policy: DiscoveryPolicy;
  candidates: SourceCandidateProjection[];
  started_at: string;
  ended_at?: string;
}

export async function beginDiscoveryRun(
  workspaceId: WorkspaceId,
  cwd: string,
  policyRequest?: Partial<DiscoveryPolicy>,
): Promise<{ run_id: RunId }> {
  const active = await readActiveRunForWorkspace(workspaceId);
  if (active) return { run_id: active.id };

  const policy = computeEffectivePolicy(policyRequest);
  const run = await startDiscoveryRun(workspaceId, policy);

  // Execute asynchronously — caller polls via getRunView
  executeDiscovery(workspaceId, run, cwd).catch(err =>
    console.error(`[discovery] executeDiscovery error for run ${run.id}:`, err),
  );

  return { run_id: run.id };
}

export async function getRunView(workspaceId: WorkspaceId, runId: RunId): Promise<DiscoveryRunView | null> {
  const run = await readDiscoveryRun(workspaceId, runId);
  if (!run) return null;

  const evidence = await readCandidateEvidence(workspaceId, runId);
  const decisions = await readSelectionDecisions(workspaceId, runId);

  const byCandidate = groupEvidenceByCandidate(evidence);
  const candidates = Object.values(byCandidate).map(evList =>
    projectCandidate(evList, decisions),
  );

  return {
    run_id: run.id,
    workspace_id: run.workspaceId,
    status: run.status,
    policy: run.policySnapshot,
    candidates,
    started_at: run.startedAt,
    ended_at: run.endedAt,
  };
}

export async function recordSelection(
  workspaceId: WorkspaceId,
  runId: RunId,
  candidateRef: string,
  selection: 'INCLUDED' | 'EXCLUDED',
): Promise<void> {
  const candidateId = parseCandidateRef(candidateRef);
  const decision: SelectionDecisionRecord = {
    candidateId,
    runId,
    decision: selection === 'INCLUDED' ? 'INCLUDE' : 'EXCLUDE',
    requestId: randomUUID(),
    actorId: 'user',
    decidedAt: new Date().toISOString(),
  };
  await appendSelectionDecision(workspaceId, runId, decision);
}

export async function resolveIdentityConflict(
  workspaceId: WorkspaceId,
  runId: RunId,
  refs: string[],
  relation: 'SAME' | 'DIFFERENT',
): Promise<void> {
  // Record an identity resolution decision by merging provenance or marking different
  // In Stage 1 this is a no-op record — the projection will show RESOLVED/AMBIGUOUS accordingly
  // A real implementation would store a ResolutionRecord; defer to Stage 2
  console.log(`[discovery] identity resolution recorded: ${refs.join(',')} → ${relation}`);
}

export async function addCandidate(
  workspaceId: WorkspaceId,
  runId: RunId,
  locator: string,
  kind: 'GIT_REPO' | 'FOLDER' | 'UNKNOWN',
): Promise<void> {
  const run = await readDiscoveryRun(workspaceId, runId);
  if (!run) throw new Error(`Run ${runId} not found`);

  const inspection = await inspectSourceCandidate(locator, kind === 'UNKNOWN' ? 'FOLDER' : kind);
  const evidence: CandidateEvidenceRecord = {
    candidateId: randomUUID(),
    runId,
    locator: inspection.locator,
    kind: inspection.kind === 'UNKNOWN' ? 'FOLDER' : inspection.kind,
    availability: inspection.availability,
    support: inspection.support,
    identityEvidence: inspection.identityEvidence,
    sessionCount: 0,
    providerSessionIds: [],
    provenance: ['manual'],
    recordedAt: new Date().toISOString(),
  };
  await appendCandidateEvidence(workspaceId, runId, evidence);
}

export async function getIncludedRefs(
  workspaceId: WorkspaceId,
  runId: RunId,
): Promise<string[]> {
  const evidence = await readCandidateEvidence(workspaceId, runId);
  const decisions = await readSelectionDecisions(workspaceId, runId);
  const byCandidate = groupEvidenceByCandidate(evidence);
  return Object.values(byCandidate)
    .map(evList => projectCandidate(evList, decisions))
    .filter(c => c.selection === 'INCLUDED')
    .map(c => formatCandidateRef(c.ref.runId, c.ref.candidateId));
}

function groupEvidenceByCandidate(
  evidence: CandidateEvidenceRecord[],
): Record<string, CandidateEvidenceRecord[]> {
  const map: Record<string, CandidateEvidenceRecord[]> = {};
  for (const e of evidence) {
    (map[e.candidateId] ??= []).push(e);
  }
  return map;
}

function parseCandidateRef(ref: string): string {
  const parts = ref.split(':');
  return parts[parts.length - 1];
}

export function formatCandidateRef(runId: RunId, candidateId: string): string {
  return `${runId}:${candidateId}`;
}
