import type { Account } from "@/lib/salesforce/types";

/**
 * Example Saved Worklists shown in the demo. These are in-memory demo data:
 * the picker gets them from `buildExampleWorklistViews()` (see
 * `lib/worklists/saved.ts`), independent of Convex, so they appear in the
 * deployed demo whether or not Convex is wired or seeded. Their pre-worked
 * state is likewise faked in memory (see `EXAMPLE_WORKED_ACCOUNT_IDS`), not
 * read from the audit log. The dev seed route no longer loads them.
 *
 * IMPORTANT: these lists reference their OWN dedicated accounts
 * (`EXAMPLE_WORKLIST_ACCOUNTS`), NOT the accounts on the main BDR worklist. The
 * dedicated accounts are `worklistHidden`, so they never enter the account
 * worklist enumeration (`listAccounts`) and therefore never change the counts or
 * contents of the main Worklist screen. They exist only to give the saved-list
 * picker something to measure progress against — the picker's worked/total and
 * its Active vs Completed grouping come from the audit log (lifetime worked)
 * intersected with a list's account ids, not from the account worklist.
 *
 * To make the picker "look pre-worked" in the demo, a prefix of each list's
 * accounts is seeded into the audit log as worked (see `EXAMPLE_WORKED_ACCOUNT_IDS`
 * and the seed route): Tradeshow 3/12 (active), BMS Upsell 10/12 (active, mostly
 * worked), ABX MV Dental 12/12 (Completed).
 */
export interface ExampleWorklistSpec {
  /** Stable, human-readable key. The per-user business id is derived from this. */
  key: string;
  name: string;
  /** Short label shown as a pill in the picker (campaign source). */
  source: string | null;
  /** Days from seed time until the list expires; kept ≤ 30 (the retention window). */
  expiresInDays: number | null;
  accountIds: string[];
  /** How many of `accountIds` are seeded as worked, so the demo looks pre-worked. */
  workedCount: number;
}

interface ExampleDef {
  key: string;
  name: string;
  source: string | null;
  expiresInDays: number | null;
  /** Prefix of `companies` seeded as worked in the audit log. */
  workedCount: number;
  /** 2-char tag baked into generated account ids (kept unique across defs). */
  idTag: string;
  industry: string;
  /** One dedicated account per name; full names are unique so domains never clash. */
  companies: string[];
}

// A worklist belongs to one product line — reps don't work across products — so
// every dedicated account here is Intacct (all three example lists are Intacct
// for now). The account industries still vary per list for flavour.
const LIST_PRODUCT = "Intacct" as const;

// Rotated by index so a selected list shows a realistic P1/P2/P3 spread and a
// mix of scores (fit is rating-driven, intent is buying-stage-driven — see
// lib/scoring/scoring.ts) rather than 12 identical rows.
const RATINGS = ["P1", "P2", "P3"] as const;
const BUYING_STAGES = ["Decision", "Purchase", "Consideration", "Awareness"] as const;

function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "");
}
function pad3(n: number): string {
  return String(n).padStart(3, "0");
}

// Company names are distinct from every other fixture (and from each other), so
// the exact-match duplicate check (domain/name) can never link one of these to a
// real worklist account. Themed per list purely for readability.
const DEFS: ExampleDef[] = [
  {
    key: "tradeshow-money2020",
    name: "Tradeshow — Money20/20",
    source: "Tradeshow",
    expiresInDays: 30,
    workedCount: 3,
    idTag: "TS",
    industry: "Financial Services",
    companies: [
      "Northwind Payments", "Tidewater Financial", "Brightpay Systems",
      "Cobalt Ledger", "Summitline Capital", "Harborstone Financial",
      "Everpeak Payments", "Lakeside Fintech", "Meridianpay Group",
      "Ironvault Capital", "Clearwater Merchant Co", "Foxglen Financial",
    ],
  },
  {
    key: "bms-upsell",
    name: "BMS Upsell",
    source: "Upsell",
    expiresInDays: 21,
    workedCount: 10,
    idTag: "BU",
    industry: "Business Services",
    companies: [
      "Maplewood Trading", "Redstone Logistics", "Brookfield Supply Co",
      "Camden Works", "Delta Ridge Manufacturing", "Elmwood Distribution",
      "Fairhaven Industries", "Granite Peak Foods", "Havenbrook Retail",
      "Junction Wholesale", "Kingsley Fabrication", "Larkspur Trading Co",
    ],
  },
  {
    key: "abx-mv-dental",
    name: "ABX MV Dental",
    source: "ABX",
    expiresInDays: 14,
    workedCount: 12,
    idTag: "AX",
    industry: "Healthcare",
    companies: [
      "Cedar Ridge Dental", "Brightsmile Dental Group", "Lakeshore Family Dentistry",
      "Summit Orthodontics", "Riverbend Dental Care", "Oakmont Dental Partners",
      "Maple Grove Dental", "Harbor City Dental", "Pinecrest Dental Studio",
      "Stonegate Dental", "Westfield Dental Associates", "Clearview Family Dental",
    ],
  },
];

const accounts: Account[] = [];
const specs: ExampleWorklistSpec[] = [];
const workedIds: string[] = [];

for (const def of DEFS) {
  const ids: string[] = [];
  def.companies.forEach((company, i) => {
    const id = `0015Y00000${def.idTag}${pad3(i)}`; // 15 chars, unique per (tag,i)
    ids.push(id);
    accounts.push({
      id,
      name: company,
      domain: `${slug(company)}.com`,
      ownerId: "house",
      ownerName: "House Account",
      industry: def.industry,
      type: "Prospect",
      product: LIST_PRODUCT,
      // Active TAM + clean (no opp / customer / ROE / duplicate) → WORKABLE, so
      // a selected list renders scored, workable rows.
      tam: LIST_PRODUCT,
      rating: RATINGS[i % RATINGS.length],
      buyingStage: BUYING_STAGES[i % BUYING_STAGES.length],
      abmNurtureStatus: null,
      lastActivityDate: null,
      intacct: { hasOpenOpps: false },
      // Keep them off the main BDR worklist — they exist only to populate the
      // saved-list picker's progress.
      worklistHidden: true,
    });
    if (i < def.workedCount) workedIds.push(id);
  });
  specs.push({
    key: def.key,
    name: def.name,
    source: def.source,
    expiresInDays: def.expiresInDays,
    accountIds: ids,
    workedCount: def.workedCount,
  });
}

/** Dedicated (hidden) accounts backing the example lists. Merged into the CRM fixtures. */
export const EXAMPLE_WORKLIST_ACCOUNTS: Account[] = accounts;

export const EXAMPLE_SAVED_WORKLISTS: ExampleWorklistSpec[] = specs;

/** Account ids seeded into the audit log as worked, so the picker looks pre-worked. */
export const EXAMPLE_WORKED_ACCOUNT_IDS: string[] = workedIds;

/**
 * Shared prefix for every example-worklist id (both the in-memory view id and
 * any legacy per-user Convex business id). `listSavedWorklists` drops Convex
 * rows with this prefix so a previously-seeded example can't double the
 * in-memory one.
 */
export const EXAMPLE_WORKLIST_ID_PREFIX = "swl_example_";

/**
 * Stable id for an in-memory example list. User-independent: the examples are
 * the same demo data for whoever is signed in, so the id doesn't encode a user.
 */
export function exampleViewId(key: string): string {
  return `${EXAMPLE_WORKLIST_ID_PREFIX}${key}`;
}

/**
 * The Convex business id for an example list, per user. Retained for the legacy
 * seed path and its tests; the live demo uses `exampleViewId` (in-memory).
 * Encoding the user id keeps ids globally unique — the saved-worklist lookup
 * (`by_business_id`) resolves an id to a single row before checking ownership,
 * so two users must never share one business id.
 */
export function exampleWorklistId(key: string, userId: string): string {
  return `${EXAMPLE_WORKLIST_ID_PREFIX}${key}_${userId}`;
}
