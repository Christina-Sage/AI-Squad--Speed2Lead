import { ABM_ACCOUNT_STATUSES } from "@/lib/abm-status";
import {
  CUSTOMER_EXACT_PRODUCT,
  CUSTOMER_EXISTING,
  CUSTOMER_TAM_BLANK,
} from "@/lib/workability/customer-tam";
import { DUPLICATE_ACCOUNT } from "@/lib/workability/engine-codes";
import { WRONG_VERTICAL } from "@/lib/workability/vertical";

/**
 * ABM Account Nurture Status the engine sets when an account is *blocked* by
 * de-dupe. Business rule: blocked-by-de-dupe → the engine writes the status;
 * anything that lands in the worklist (workable / review) is left for the rep.
 * So this only maps *block* reason codes to a picklist value — a duplicate, a
 * wrong-vertical (route to CRE), or a current-customer block. ROE / open-opp
 * blocks are transient conflicts, not a nurture disposition, so they write
 * nothing.
 *
 * Returns null when no block reason maps to a status (leave the field alone).
 */
export function recommendedAbmStatus(reasonCodes: string[]): string | null {
  let status: string | null = null;
  if (reasonCodes.includes(DUPLICATE_ACCOUNT)) {
    status = "Duplicate Account";
  } else if (reasonCodes.includes(WRONG_VERTICAL)) {
    status = "Incorrect Vertical";
  } else if (
    reasonCodes.includes(CUSTOMER_EXACT_PRODUCT) ||
    reasonCodes.includes(CUSTOMER_EXISTING) ||
    reasonCodes.includes(CUSTOMER_TAM_BLANK)
  ) {
    status = "Current Customer";
  }

  // Guard against drift between this mapping and the real picklist.
  if (status && !ABM_ACCOUNT_STATUSES.includes(status)) return null;
  return status;
}

/** ABM statuses the engine owns (safe to overwrite idempotently on a block). */
export const ENGINE_OWNED_ABM_STATUSES = ["Duplicate Account", "Incorrect Vertical", "Current Customer"];
