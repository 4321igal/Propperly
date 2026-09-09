# Discovery — External Contract

Signatures only. No implementation. This is the surface SL-02 Source
Discovery exposes to APP (REST, mounted under `/api/discovery/*` — see
[Implementation Design §6](../../propperly-engineering-handoffs/sl-02-source-discovery-software/IMPLEMENTATION_DESIGN_en.md#6-api--protocol-design)).

## Exposed to APP (REST)

```ts
interface DiscoveryApi {
  // R-3 — Discovery + Candidates
  startDiscoveryRun(policy: DiscoveryPolicy): Promise<{ run_id: string }>;
  getDiscoveryRun(run_id: string): Promise<DiscoveryRunView>;
  recordCandidateSelection(run_id: string, candidate_ref: string, selection: "INCLUDED" | "EXCLUDED"): Promise<void>;
  resolveIdentity(run_id: string, refs: string[], relation: "SAME" | "DIFFERENT"): Promise<void>;
  addCandidateByPath(run_id: string, path: string, kind: SourceKind): Promise<void>;

  // R-4 — Approval Authority
  getProposedInventory(run_id: string): Promise<ProposedInventoryView>;
  confirmSourceInventory(input: {
    run_id: string;
    refs: string[];
    expected_inventory_version: string;
    expected_review_revision: string;
    request_id: string;
  }): Promise<ConfirmationReceipt>;

  // R-1 extension
  getWorkspaceState(): Promise<{ has_approved_inventory: boolean }>;
}
```

## Internal seam (R-3 → R-2, not exposed outside this module)

```ts
type SourceKind = "repo" | "folder" | "session";

interface SourceAccessResult {
  locator: string;
  kind: SourceKind;
  availability: "AVAILABLE" | "INACCESSIBLE" | "UNKNOWN";
  support: "SUPPORTED" | "UNSUPPORTED" | "UNKNOWN";
}

interface SourceAccess {
  inspectSourceCandidate(locator: string, kind: SourceKind): Promise<SourceAccessResult>;
}
```

See [`source-access/index.ts`](source-access/index.ts), [`discovery/index.ts`](discovery/index.ts),
[`approval/index.ts`](approval/index.ts), and [`routes/index.ts`](routes/index.ts)
for the placeholder module stubs these signatures map to.
