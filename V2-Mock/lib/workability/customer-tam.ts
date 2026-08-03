import type { AccountType, CustomerProductOwnership, TamStatus } from "@/lib/salesforce/types";
import { defaultProductForSegment, type ExactProduct, type Product } from "@/lib/products";

export type CustomerStatus = "PASS" | "WARNING" | "BLOCKED";
export type TamValidationStatus = "PASS" | "WARNING";

export interface CustomerTamResult {
  customerStatus: CustomerStatus;
  tamStatus: TamValidationStatus;
  reasonCodes: string[];
}

export const CUSTOMER_TAM_BLANK = "CUSTOMER_TAM_BLANK";
export const CUSTOMER_EXPIRED_TAM = "CUSTOMER_EXPIRED_TAM";
/** Existing customer with an active TAM — actively managed, not workable. */
export const CUSTOMER_EXISTING = "CUSTOMER_EXISTING";
export const TAM_EXPIRED = "TAM_EXPIRED";
/** Current customer of the *exact* product being worked — hard block. */
export const CUSTOMER_EXACT_PRODUCT = "CUSTOMER_EXACT_PRODUCT";
/** Current customer of a *different* product (cross-sell) — review. */
export const CUSTOMER_OTHER_PRODUCT = "CUSTOMER_OTHER_PRODUCT";
/** Former customer of any product (win-back) — review. */
export const CUSTOMER_FORMER = "CUSTOMER_FORMER";
/** TAM segment ≠ the segment being worked (e.g. TAM=Intacct, working X3) — review. */
export const SEGMENT_MISMATCH = "SEGMENT_MISMATCH";

/** An expired TAM of any product line, e.g. "Expired Intacct TAM", "Expired X3 TAM". */
export function isExpiredTam(tam: TamStatus): boolean {
  return tam !== null && tam.startsWith("Expired ");
}

/**
 * The team/segment a TAM value names. TAM carries the segment: "Intacct",
 * "Expired X3 TAM", etc. Blank TAM names no segment.
 */
export function tamSegment(tam: TamStatus): Product | null {
  if (tam === null) return null;
  const raw = isExpiredTam(tam) ? tam.replace(/^Expired\s+/, "").replace(/\s+TAM$/, "") : tam;
  return (raw as Product) || null;
}

/** Three-system context that upgrades the coarse type/TAM check to product-aware. */
export interface CustomerTamContext {
  /** Team/segment being worked (`account.product`). */
  segment?: Product;
  /** Exact product being worked; falls back to a representative of `segment`. */
  workedProduct?: ExactProduct | null;
  /** Products this company owns, matched across GMO / Intacct SF / Fusion. */
  customerProducts?: CustomerProductOwnership[];
}

/**
 * Customer + TAM verdict.
 *
 * Product-aware (the confirmed model): a *current* customer of the *exact*
 * product being worked blocks; a customer of any *other* product, a *former*
 * customer, or a TAM-segment mismatch (TAM=Intacct while working a non-Intacct
 * product) all downgrade to review; no match passes.
 *
 * Two evidence sources, in order:
 *  1. `ctx.customerProducts` — the three-system-matched ownership list. When
 *     present it is authoritative for the customer verdict.
 *  2. Fallback — the coarse `type` + `tam` heuristic (backward compatible with
 *     records that carry no matched ownership): a Customer whose active TAM
 *     segment equals the worked segment is treated as an exact-product customer.
 */
export function evaluateCustomerTam(
  type: AccountType,
  tam: TamStatus,
  ctx: CustomerTamContext = {},
): CustomerTamResult {
  const isCustomer = type === "Customer";
  const workedSegment = ctx.segment ?? tamSegment(tam);
  const workedProduct =
    ctx.workedProduct ?? (workedSegment ? defaultProductForSegment(workedSegment) : null);

  // A TAM-segment mismatch reviews on its own (independent of customer status):
  // an active TAM naming a different segment than the one being worked.
  const activeTam = tam !== null && !isExpiredTam(tam);
  const mismatch = activeTam && workedSegment !== null && tamSegment(tam) !== workedSegment;

  // 1. Product-aware path — explicit matched ownership.
  const owned = ctx.customerProducts ?? [];
  if (owned.length > 0) {
    const currentExact = owned.some((o) => o.status === "current" && o.product === workedProduct);
    if (currentExact) {
      return { customerStatus: "BLOCKED", tamStatus: "PASS", reasonCodes: [CUSTOMER_EXACT_PRODUCT] };
    }
    const currentOther = owned.some((o) => o.status === "current");
    if (currentOther) {
      return { customerStatus: "WARNING", tamStatus: "PASS", reasonCodes: [CUSTOMER_OTHER_PRODUCT] };
    }
    // Only former ownership left.
    return { customerStatus: "WARNING", tamStatus: "PASS", reasonCodes: [CUSTOMER_FORMER] };
  }

  // 2. Fallback heuristic — no matched ownership; infer from type + TAM.
  if (isCustomer && tam === null) {
    return { customerStatus: "BLOCKED", tamStatus: "WARNING", reasonCodes: [CUSTOMER_TAM_BLANK] };
  }

  if (isCustomer && isExpiredTam(tam)) {
    return { customerStatus: "WARNING", tamStatus: "WARNING", reasonCodes: [CUSTOMER_EXPIRED_TAM] };
  }

  if (isCustomer) {
    // Active TAM. If it names a *different* segment than the one being worked,
    // this is a customer of another product line → review; otherwise it's an
    // exact-segment customer, actively managed → block.
    return mismatch
      ? { customerStatus: "WARNING", tamStatus: "PASS", reasonCodes: [CUSTOMER_OTHER_PRODUCT] }
      : { customerStatus: "BLOCKED", tamStatus: "PASS", reasonCodes: [CUSTOMER_EXISTING] };
  }

  // Non-customer.
  if (isExpiredTam(tam)) {
    return { customerStatus: "PASS", tamStatus: "WARNING", reasonCodes: [TAM_EXPIRED] };
  }

  if (mismatch) {
    // TAM territory names a different segment than the one being worked → review.
    return { customerStatus: "PASS", tamStatus: "WARNING", reasonCodes: [SEGMENT_MISMATCH] };
  }

  return { customerStatus: "PASS", tamStatus: "PASS", reasonCodes: [] };
}
