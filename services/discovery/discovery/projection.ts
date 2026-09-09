import type {
  CandidateEvidenceRecord,
  SelectionDecisionRecord,
  SourceCandidateProjection,
  Availability,
  Support,
  Identity,
  Selection,
} from '../../../app/src/domain/types.js';

export function projectCandidate(
  evidence: CandidateEvidenceRecord[],
  decisions: SelectionDecisionRecord[],
): SourceCandidateProjection {
  if (evidence.length === 0) throw new Error('Cannot project: no evidence records');

  const latest = evidence[evidence.length - 1];
  const candidateId = latest.candidateId;

  // availability — latest evidence wins
  const availability: Availability = latest.availability;

  // support — latest evidence wins
  const support: Support = latest.support;

  // identity — conservative: AMBIGUOUS unless all evidence points to same locator
  const locators = new Set(evidence.map(e => e.locator));
  const identity: Identity = locators.size === 1 ? 'RESOLVED' : 'AMBIGUOUS';

  // selection — latest non-RESET decision wins; RESET returns to UNDECIDED
  const myDecisions = decisions.filter(d => d.candidateId === candidateId);
  let selection: Selection = 'UNDECIDED';
  for (const d of myDecisions) {
    if (d.decision === 'INCLUDE') selection = 'INCLUDED';
    else if (d.decision === 'EXCLUDE') selection = 'EXCLUDED';
    else if (d.decision === 'RESET') selection = 'UNDECIDED';
  }

  // merge sessionCount and provenance across all evidence
  const sessionCount = evidence.reduce((acc, e) => acc + e.sessionCount, 0);
  const provenance = [...new Set(evidence.flatMap(e => e.provenance))];

  return {
    ref: { runId: latest.runId ?? '', candidateId },
    locator: latest.locator,
    kind: latest.kind,
    displayName: latest.locator.split('/').pop() ?? latest.locator,
    availability,
    support,
    identity,
    selection,
    sessionCount,
    provenance,
  };
}
