// Placeholder module — no implementation yet.
//
// R-2 (Source Access): typed interface for accessing a source at a locator.
// Real adapters (local repo via Git metadata, folder stat/walk, session
// metadata) to be implemented per the Implementation Design, milestone M1.
// Does NOT own discovery orchestration, candidate logic, or approval.

export type SourceKind = "repo" | "folder" | "session";

export interface SourceAccessResult {
  locator: string;
  kind: SourceKind;
  availability: "AVAILABLE" | "INACCESSIBLE" | "UNKNOWN";
  support: "SUPPORTED" | "UNSUPPORTED" | "UNKNOWN";
}

export async function inspectSourceCandidate(
  locator: string,
  kind: SourceKind,
): Promise<SourceAccessResult> {
  throw new Error("not implemented");
}
