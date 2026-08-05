import type { Product } from "@/lib/products";
import { ACCOUNTS } from "@/lib/salesforce/mock/fixtures/accounts";

/**
 * Example Saved Worklists shown in the demo. Saved worklists live in Convex
 * (per user), so these are loaded by the dev seed route (`/api/dev/seed`) for
 * every demo user, exactly like the CRM fixtures. They are NOT surfaced in the
 * in-memory `mock` provider — saved worklists are Convex-backed by design.
 *
 * Each spec selects real seeded accounts (see fixtures/accounts.ts) so the
 * picker's progress bar and the worklist filter behave like a genuine campaign
 * list. Selection is derived from the fixtures rather than hardcoded ids, so it
 * stays in sync if the generated demo accounts change.
 */
export interface ExampleWorklistSpec {
  /** Stable, human-readable key. The per-user business id is derived from this. */
  key: string;
  name: string;
  /** Short label shown as a pill in the picker (campaign source). */
  source: string | null;
  /** Days from seed time until the list expires; null = never expires. */
  expiresInDays: number | null;
  accountIds: string[];
}

// Accounts that actually appear on the BDR worklist (hidden originals/backers
// are excluded, mirroring how the worklist itself is built).
const VISIBLE = ACCOUNTS.filter((a) => !a.worklistHidden);

/** First `n` visible account ids for a product line, in fixture order. */
function byProduct(product: Product, n: number): string[] {
  return VISIBLE.filter((a) => a.product === product)
    .slice(0, n)
    .map((a) => a.id);
}

/** First `n` visible account ids for a product line + industry vertical. */
function byVertical(product: Product, industry: string, n: number): string[] {
  return VISIBLE.filter((a) => a.product === product && a.industry === industry)
    .slice(0, n)
    .map((a) => a.id);
}

/** Drop duplicate ids while preserving order. */
function dedupe(ids: string[]): string[] {
  return [...new Set(ids)];
}

export const EXAMPLE_SAVED_WORKLISTS: ExampleWorklistSpec[] = [
  {
    // A tradeshow booth haul — cross-segment leads scanned at the event, so it
    // spans several product lines rather than one.
    key: "tradeshow-money2020",
    name: "Tradeshow — Money20/20",
    source: "Tradeshow",
    expiresInDays: 90,
    accountIds: dedupe([
      ...byProduct("Intacct", 2),
      ...byProduct("X3", 1),
      ...byProduct("BMS", 1),
      ...byProduct("CRE", 1),
      ...byProduct("SSG", 1),
    ]),
  },
  {
    // Account-based experience play against a single vertical (dental ≈
    // healthcare in the demo data set).
    key: "abx-mv-dental",
    name: "ABX MV Dental",
    source: "ABX",
    expiresInDays: null,
    accountIds: dedupe(byVertical("Intacct", "Healthcare", 6)),
  },
  {
    // Upsell campaign scoped to a single product line (BMS).
    key: "bms-upsell",
    name: "BMS Upsell",
    source: "Upsell",
    expiresInDays: null,
    accountIds: dedupe(byProduct("BMS", 6)),
  },
];

/**
 * The Convex business id for an example list, per user. Encoding the user id
 * keeps ids globally unique — the saved-worklist lookup (`by_business_id`)
 * resolves an id to a single row before checking ownership, so two users must
 * never share one business id.
 */
export function exampleWorklistId(key: string, userId: string): string {
  return `swl_example_${key}_${userId}`;
}
