// Phase 0 — Shared Types & Contracts (Slice 01)

// --- Workspace ---
export type WorkspaceId = string;
export type WorkspaceState =
  | 'NEW'
  | 'DISCOVERY_ACTIVE'
  | 'DISCOVERY_INTERRUPTED'
  | 'REVIEW_PENDING'
  | 'INVENTORY_APPROVED'
  | 'COMMISSIONED';

export interface Workspace {
  id: WorkspaceId;
  state: WorkspaceState;
  cwd: string;
  createdAt: string; // ISO
  activeRunId?: RunId;
}

// --- DiscoveryRun ---
export type RunId = string;
export type RunStatus = 'RUNNING' | 'COMPLETED' | 'PARTIAL' | 'INTERRUPTED' | 'FAILED' | 'CANCELLED';

export interface DiscoveryRun {
  id: RunId;
  workspaceId: WorkspaceId;
  status: RunStatus;
  policySnapshot: DiscoveryPolicy;
  startedAt: string;
  endedAt?: string;
}

// --- DiscoveryPolicy ---
export interface DiscoveryPolicy {
  providers: string[];
  sessionWindowDays: number;
  maxCandidates: number;
}

// --- SourceCandidate (four dimensions) ---
export type Availability = 'AVAILABLE' | 'INACCESSIBLE' | 'UNKNOWN';
export type Support     = 'SUPPORTED' | 'UNSUPPORTED' | 'UNKNOWN';
export type Identity    = 'RESOLVED' | 'AMBIGUOUS' | 'UNRESOLVED';
export type Selection   = 'UNDECIDED' | 'INCLUDED' | 'EXCLUDED';

export interface CandidateRef { runId: RunId; candidateId: string; }

export interface SourceCandidateProjection {
  ref: CandidateRef;
  locator: string;
  kind: 'GIT_REPO' | 'FOLDER' | 'UNKNOWN';
  displayName: string;
  availability: Availability;
  support: Support;
  identity: Identity;
  selection: Selection;
  sessionCount: number;
  provenance: string[];
}

// --- Identity Evidence ---
export type IdentityRelation = 'SAME_LOCATOR' | 'AMBIGUOUS' | 'DIFFERENT';

export interface IdentityEvidence {
  candidateId: string;
  relation: IdentityRelation;
  basis: string;
}

// --- External Identity (from source adapter) ---
export interface ExternalIdentity {
  provider: string;
  value: string;
  confidence: 'STRONG' | 'WEAK';
}

// --- Source (post-approval) ---
export type SourceId = string;

export interface Source {
  id: SourceId;
  workspaceId: WorkspaceId;
  locator: string;
  kind: string;
  approvedAt: string;
}

// --- SourceInventory ---
export interface SourceInventory {
  workspaceId: WorkspaceId;
  version: number;
  head: string;
  sources: Source[];
  confirmedAt: string;
}

// --- Inspection types (R-2 Source Access) ---
export interface InspectionResult {
  locator: string;
  kind: 'GIT_REPO' | 'FOLDER' | 'UNKNOWN';
  availability: Availability;
  support: Support;
  identityEvidence: ExternalIdentity[];
}

export interface RepoIdentity {
  path: string;
  remoteUrl?: string;
  remoteName?: string;
}

export interface FolderIdentity {
  path: string;
  exists: boolean;
  isDirectory: boolean;
  readable: boolean;
}

// --- Internal persistence record types (data-center) ---

export interface CandidateEvidenceRecord {
  candidateId: string;
  runId: RunId;
  locator: string;
  kind: 'GIT_REPO' | 'FOLDER' | 'UNKNOWN';
  availability: Availability;
  support: Support;
  identityEvidence: ExternalIdentity[];
  sessionCount: number;
  providerSessionIds: string[];
  provenance: string[];
  recordedAt: string;
}

export interface SelectionDecisionRecord {
  candidateId: string;
  runId: RunId;
  decision: 'INCLUDE' | 'EXCLUDE' | 'RESET';
  requestId: string;
  actorId: string;
  decidedAt: string;
}

export interface ConfirmationReceipt {
  requestId: string;
  workspaceId: WorkspaceId;
  inventoryVersion: number;
  reviewRevision: string;
  actorId: string;
  timestamp: string;
  committedInventory: SourceInventory;
}

// --- Session Provider types (R-3) ---

export interface DiscoveredReference {
  locator: string;
  inferredKind: 'GIT_REPO' | 'FOLDER' | 'UNKNOWN';
  sessionCount: number;
  providerSessionIds: string[];
}

export interface SessionProvider {
  id: string;
  discover(policy: DiscoveryPolicy): AsyncIterable<DiscoveredReference>;
}

// --- Logical Interfaces (Section 8) ---

export interface BootstrapApi {
  resolveWorkspace(context: { cwd: string }): Promise<Workspace>;
  startOrResumeSourceDiscovery(workspaceId: WorkspaceId, policyRequest?: Partial<DiscoveryPolicy>, expectedState?: WorkspaceState): Promise<DiscoveryRun>;
  getDiscoveryStatus(runId: RunId): Promise<DiscoveryRun>;
  reviewSourceCandidates(workspaceId: WorkspaceId, runId: RunId): Promise<SourceCandidateProjection[]>;
  recordCandidateSelection(ref: CandidateRef, decision: 'INCLUDE' | 'EXCLUDE' | 'RESET', requestId: string): Promise<void>;
  addSourceCandidate(locator: string, declaredKind: string | undefined, requestId: string): Promise<SourceCandidateProjection>;
  confirmSourceInventory(workspaceId: WorkspaceId, includedRefs: CandidateRef[], expectedInventoryVersion: number, expectedReviewRevision: string, requestId: string): Promise<SourceInventory>;
}

export interface SourceAccessApi {
  inspectSourceCandidate(input: { kind: string; locator: string }): Promise<InspectionResult>;
  identifyLocalRepository(locator: string): Promise<RepoIdentity>;
  identifyLocalFolder(locator: string): Promise<FolderIdentity>;
}
