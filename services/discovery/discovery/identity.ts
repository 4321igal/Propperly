import path from 'node:path';
import type { CandidateEvidenceRecord, IdentityRelation } from '../../../app/src/domain/types.js';

export function resolveIdentityRelation(
  a: CandidateEvidenceRecord,
  b: CandidateEvidenceRecord,
): IdentityRelation {
  const normA = path.normalize(a.locator);
  const normB = path.normalize(b.locator);
  if (normA === normB) return 'SAME_LOCATOR';

  const aRemotes = a.identityEvidence
    .filter(e => e.provider === 'git-remote' && e.confidence === 'STRONG')
    .map(e => e.value);
  const bRemotes = b.identityEvidence
    .filter(e => e.provider === 'git-remote' && e.confidence === 'STRONG')
    .map(e => e.value);

  if (aRemotes.length > 0 && bRemotes.length > 0) {
    const aSet = new Set(aRemotes);
    const intersects = bRemotes.some(r => aSet.has(r));
    if (intersects) return 'AMBIGUOUS'; // same remote, different locator — do not auto-merge
    return 'DIFFERENT';
  }

  return 'AMBIGUOUS';
}
