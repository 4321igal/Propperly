import { createHash } from 'node:crypto';
import type { SourceCandidateProjection } from '../../../app/src/domain/types.js';

export function computeReviewRevision(projections: SourceCandidateProjection[]): string {
  const sorted = [...projections].sort((a, b) => a.ref.candidateId.localeCompare(b.ref.candidateId));
  const payload = sorted.map(p => `${p.ref.candidateId}:${p.selection}:${p.availability}:${p.support}:${p.identity}`).join('|');
  return createHash('sha256').update(payload).digest('hex').slice(0, 16);
}
