// Shape of the Services API consumed by APP. Signatures only — no implementation.

export interface ServicesClient {
  // Placeholder use-case call. Real use-cases (identity, obligations, etc.)
  // will be defined by Services, not invented here.
  ping(): Promise<{ status: string }>;
}
