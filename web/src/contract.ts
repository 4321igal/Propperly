// Shape of the APP API consumed by WEB. Signatures only — no implementation.

export interface AppClient {
  // Placeholder use-case call. Real use-cases (identity, obligations, etc.)
  // will be defined by APP, not invented here.
  ping(): Promise<{ status: string }>;
}
