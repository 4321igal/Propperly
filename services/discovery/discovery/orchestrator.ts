import { randomUUID } from 'node:crypto';
import { persistDiscoveryRun, updateRunStatus, readDiscoveryRun } from '../../../data-center/src/discovery-store.js';
import { appendCandidateEvidence, readCandidateEvidence } from '../../../data-center/src/candidate-store.js';
import { inspectSourceCandidate } from '../source-access/index.js';
import { discoverReferences } from './providers/filesystem-provider.js';
import type {
  DiscoveryRun,
  DiscoveryPolicy,
  WorkspaceId,
  RunId,
  CandidateEvidenceRecord,
} from '../../../app/src/domain/types.js';

export async function startDiscoveryRun(
  workspaceId: WorkspaceId,
  policy: DiscoveryPolicy,
): Promise<DiscoveryRun> {
  const run: DiscoveryRun = {
    id: randomUUID(),
    workspaceId,
    status: 'RUNNING',
    policySnapshot: policy,
    startedAt: new Date().toISOString(),
  };
  await persistDiscoveryRun(workspaceId, run);
  return run;
}

export async function resumeDiscoveryRun(workspaceId: WorkspaceId, runId: RunId): Promise<DiscoveryRun | null> {
  const run = await readDiscoveryRun(workspaceId, runId);
  if (!run) return null;
  if (run.status !== 'INTERRUPTED') return run;
  await updateRunStatus(workspaceId, runId, 'RUNNING');
  return { ...run, status: 'RUNNING' };
}

export async function executeDiscovery(
  workspaceId: WorkspaceId,
  run: DiscoveryRun,
  workspaceCwd: string,
): Promise<void> {
  const existing = await readCandidateEvidence(workspaceId, run.id);
  const seenLocators = new Set(existing.map(e => e.locator));
  let anyFailed = false;
  let count = 0;

  try {
    for await (const ref of discoverReferences(run.policySnapshot, workspaceCwd)) {
      if (count >= run.policySnapshot.maxCandidates) break;
      if (seenLocators.has(ref.locator)) {
        // merge provenance for already-seen locator
        const prior = existing.find(e => e.locator === ref.locator);
        if (prior) {
          const merged: CandidateEvidenceRecord = {
            ...prior,
            sessionCount: prior.sessionCount + ref.sessionCount,
            providerSessionIds: [...new Set([...prior.providerSessionIds, ...ref.providerSessionIds])],
            provenance: [...new Set([...prior.provenance, 'filesystem'])],
            recordedAt: new Date().toISOString(),
          };
          await appendCandidateEvidence(workspaceId, run.id, merged);
        }
        continue;
      }

      const inspection = await inspectSourceCandidate(ref.locator, ref.inferredKind);
      const evidence: CandidateEvidenceRecord = {
        candidateId: randomUUID(),
        locator: ref.locator,
        kind: ref.inferredKind,
        availability: inspection.availability,
        support: inspection.support,
        identityEvidence: inspection.identityEvidence,
        sessionCount: ref.sessionCount,
        providerSessionIds: ref.providerSessionIds,
        provenance: ['filesystem'],
        recordedAt: new Date().toISOString(),
        runId: run.id,
      };
      await appendCandidateEvidence(workspaceId, run.id, evidence);
      seenLocators.add(ref.locator);
      count++;
    }
  } catch (err) {
    anyFailed = true;
    console.error('[discovery] provider error:', err);
  }

  const finalStatus = anyFailed ? 'PARTIAL' : 'COMPLETED';
  await updateRunStatus(workspaceId, run.id, finalStatus, new Date().toISOString());
}
