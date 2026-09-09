// Placeholder module — no implementation yet.
//
// R-4 (Approval Authority): explicit human confirmation, Approved Source
// Inventory, idempotent confirmation guarded by inventory_version +
// review_revision. Real implementation per the Implementation Design,
// milestone M3. This is the ONLY place the candidate -> Source authority
// transition may occur.

export interface ConfirmationReceipt {
  request_id: string;
  inventory_version: string;
  review_revision: string;
}

export interface ProposedInventoryView {
  run_id: string;
  included_refs: string[];
}

export async function getProposedInventory(run_id: string): Promise<ProposedInventoryView> {
  throw new Error("not implemented");
}

export async function confirmSourceInventory(input: {
  run_id: string;
  refs: string[];
  expected_inventory_version: string;
  expected_review_revision: string;
  request_id: string;
}): Promise<ConfirmationReceipt> {
  throw new Error("not implemented");
}
