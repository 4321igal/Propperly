// Placeholder module — no implementation yet.
//
// R-3 (Discovery + Candidates): DiscoveryRun lifecycle, four-dimension
// candidate model (availability, support, identity, selection), identity
// grouping, orchestration of source-access adapters. Real implementation
// per the Implementation Design, milestone M2. Does NOT own authorization —
// selection is never automated; INCLUDED does not create a Source (that is
// approval/'s job, R-4).

export interface DiscoveryPolicy {
  // TBD — session providers / roots to scan, per Implementation Design M2.
}

export interface DiscoveryRunView {
  run_id: string;
  status: "RUNNING" | "COMPLETED" | "PARTIAL";
}

export async function startDiscoveryRun(policy: DiscoveryPolicy): Promise<{ run_id: string }> {
  throw new Error("not implemented");
}

export async function getDiscoveryRun(run_id: string): Promise<DiscoveryRunView> {
  throw new Error("not implemented");
}

export async function recordCandidateSelection(
  run_id: string,
  candidate_ref: string,
  selection: "INCLUDED" | "EXCLUDED",
): Promise<void> {
  throw new Error("not implemented");
}

export async function resolveIdentity(
  run_id: string,
  refs: string[],
  relation: "SAME" | "DIFFERENT",
): Promise<void> {
  throw new Error("not implemented");
}
