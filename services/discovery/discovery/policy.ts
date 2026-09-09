import type { DiscoveryPolicy } from '../../../app/src/domain/types.js';

const DEFAULT_POLICY: DiscoveryPolicy = {
  providers: ['filesystem'],
  sessionWindowDays: 30,
  maxCandidates: 100,
};

export function computeEffectivePolicy(request?: Partial<DiscoveryPolicy>): DiscoveryPolicy {
  if (!request) return { ...DEFAULT_POLICY };
  return {
    providers: request.providers
      ? request.providers.filter(p => DEFAULT_POLICY.providers.includes(p))
      : DEFAULT_POLICY.providers,
    sessionWindowDays: request.sessionWindowDays !== undefined
      ? Math.min(request.sessionWindowDays, DEFAULT_POLICY.sessionWindowDays)
      : DEFAULT_POLICY.sessionWindowDays,
    maxCandidates: request.maxCandidates !== undefined
      ? Math.min(request.maxCandidates, DEFAULT_POLICY.maxCandidates)
      : DEFAULT_POLICY.maxCandidates,
  };
}
