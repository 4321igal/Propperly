# Data Center — External Contract

Signatures only. No implementation, no full schema. Accessed only through
Engine/Services.

```ts
// Living Understanding: beliefs / tensions / revisions.
interface LivingUnderstandingStore {
  getBelief(id: string): Promise<unknown>;
  recordRevision(input: unknown): Promise<{ id: string }>;
}

// Governed World: subjects / identity / lifecycle / audit.
interface GovernedWorldStore {
  getSubject(id: string): Promise<unknown>;
  appendAuditEntry(input: unknown): Promise<{ id: string }>;
}

// Storage is reached only by reference, never raw bytes.
interface StorageReference {
  storageKey: string;
}
```
