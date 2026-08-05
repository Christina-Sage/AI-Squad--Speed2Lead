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

// These example lists are placeholders whose only job is to show what a saved
// worklist looks like in the picker, so each spans every product line (rather
// than being scoped to one product/vertical). That way a list is populated
// whatever the dashboard product filter is set to.
const PRODUCT_ORDER: Product[] = ["Intacct", "X3", "BMS", "S50", "CRE", "SSG"];

/**
 * `perProduct` visible account ids from every product line, starting at
 * `offset` in each line's pool — so different example lists pick different
 * accounts. Wraps within a line if it's shorter than the requested window.
 */
function acrossProducts(perProduct: number, offset: number): string[] {
  const ids: string[] = [];
  for (const product of PRODUCT_ORDER) {
    const pool = VISIBLE.filter((a) => a.product === product).map((a) => a.id);
    for (let k = 0; k < perProduct && k < pool.length; k++) {
      ids.push(pool[(offset + k) % pool.length]);
    }
  }
  return [...new Set(ids)];
}

export const EXAMPLE_SAVED_WORKLISTS: ExampleWorklistSpec[] = [
  // Expiries are all ≤ 30 days: a saved list is archived on its expiration date
  // and then kept 30 days, so the picked date should sit inside that window.
  {
    // Tradeshow booth haul — leads scanned at the event, across every segment.
    key: "tradeshow-money2020",
    name: "Tradeshow — Money20/20",
    source: "Tradeshow",
    expiresInDays: 30,
    accountIds: acrossProducts(2, 0),
  },
  {
    // Account-based experience play (placeholder account set spans all products).
    key: "abx-mv-dental",
    name: "ABX MV Dental",
    source: "ABX",
    expiresInDays: 14,
    accountIds: acrossProducts(2, 2),
  },
  {
    // Upsell campaign (placeholder account set spans all products).
    key: "bms-upsell",
    name: "BMS Upsell",
    source: "Upsell",
    expiresInDays: 21,
    accountIds: acrossProducts(2, 4),
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
