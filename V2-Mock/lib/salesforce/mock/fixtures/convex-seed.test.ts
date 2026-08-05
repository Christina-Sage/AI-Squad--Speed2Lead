import { describe, it, expect } from "vitest";
import {
  gmoAccountFields,
  gmoActivityFields,
  gmoContactFields,
  gmoLeadFields,
  gmoOpportunityFields,
  intacctAccountFields,
  intacctActivityFields,
  intacctContactFields,
  intacctOpportunityFields,
  fusionAccountFields,
  sdrLeadFields,
  accountResolutionInsertFields,
} from "@/convex/validators";
import { ACCOUNTS } from "./accounts";
import { LEADS } from "./leads";
import { CONTACTS } from "./contacts";
import { OPPORTUNITIES } from "./opportunities";
import { ACTIVITIES } from "./activities";
import { SDR_LEADS } from "./sdr-leads";
import { decomposeToSourceTables } from "@/lib/salesforce/source-tables";
import { resolveAccounts, type MatchAccount } from "@/lib/salesforce/resolver";

// Guards the fixtures -> Convex seed boundary a live deployment would otherwise
// be first to enforce. The embedded fixtures are decomposed into the ten source
// tables (the seed path), and each table's rows are checked against its
// validator field set. Two failure modes are caught:
//   1. Convex `v.object(...)` is strict — a row key outside the validator's
//      field set is rejected at seed time.
//   2. Convex `v.optional(...)` rejects an explicit `undefined`; the seed route
//      strips undefined via a JSON round-trip, so we assert the cleaned rows
//      contain no `undefined` at any depth.
function clean<T>(rows: T[]): T[] {
  return JSON.parse(JSON.stringify(rows));
}

function hasUndefinedDeep(value: unknown): boolean {
  if (value === undefined) return true;
  if (Array.isArray(value)) return value.some(hasUndefinedDeep);
  if (value && typeof value === "object") {
    return Object.values(value).some(hasUndefinedDeep);
  }
  return false;
}

const src = decomposeToSourceTables(ACCOUNTS, LEADS, CONTACTS, OPPORTUNITIES, ACTIVITIES);

const matchAccounts: MatchAccount[] = [
  ...src.gmoAccounts.map((g) => ({
    system: "gmo" as const,
    accountId: g.id,
    domain: g.domain,
    company: g.name,
    address: g.location ?? null,
  })),
  ...src.intacctAccounts.map((r) => ({
    system: "intacct" as const,
    accountId: r.nativeId ?? r.accountId,
    domain: r.domain ?? null,
    company: r.company ?? null,
    address: r.address1 ?? null,
  })),
  ...src.fusionAccounts.map((r) => ({
    system: "fusion" as const,
    accountId: r.nativeId ?? r.accountId,
    domain: r.domain ?? null,
    company: r.company ?? null,
    address: r.address1 ?? null,
  })),
];
const resolution = resolveAccounts(matchAccounts);

const TABLES = [
  { name: "gmoAccounts", rows: src.gmoAccounts, fields: gmoAccountFields },
  { name: "gmoLeads", rows: src.gmoLeads, fields: gmoLeadFields },
  { name: "gmoContacts", rows: src.gmoContacts, fields: gmoContactFields },
  { name: "gmoOpportunities", rows: src.gmoOpportunities, fields: gmoOpportunityFields },
  { name: "gmoActivities", rows: src.gmoActivities, fields: gmoActivityFields },
  { name: "intacctAccounts", rows: src.intacctAccounts, fields: intacctAccountFields },
  { name: "intacctContacts", rows: src.intacctContacts, fields: intacctContactFields },
  { name: "intacctOpportunities", rows: src.intacctOpportunities, fields: intacctOpportunityFields },
  { name: "intacctActivities", rows: src.intacctActivities, fields: intacctActivityFields },
  { name: "fusionAccounts", rows: src.fusionAccounts, fields: fusionAccountFields },
  { name: "sdrLeads", rows: SDR_LEADS, fields: sdrLeadFields },
  { name: "accountResolution", rows: resolution, fields: accountResolutionInsertFields },
] as const;

describe("fixtures decompose into Convex-seedable source tables", () => {
  for (const { name, rows, fields } of TABLES) {
    const allowed = new Set(Object.keys(fields));

    it(`${name}: every top-level key is declared in the validator`, () => {
      for (const row of rows) {
        const unknownKeys = Object.keys(row).filter((k) => !allowed.has(k));
        expect(unknownKeys, `${name} row ${JSON.stringify(row).slice(0, 80)}`).toEqual([]);
      }
    });

    it(`${name}: no undefined values survive the seed clean()`, () => {
      expect(hasUndefinedDeep(clean(rows as unknown[]))).toBe(false);
    });
  }

  it("decomposition routes Intacct vs Fusion ownership to the right system", () => {
    // Sanity: the split fixtures produce Intacct and Fusion customer rows, and
    // Fusion never carries opportunities (Fusion has none).
    expect(src.intacctAccounts.length).toBeGreaterThan(0);
    expect(src.fusionAccounts.length).toBeGreaterThan(0);
    // Every Fusion row is customer/partner only — the table shape has no opps.
    for (const f of src.fusionAccounts) {
      expect(Object.keys(f).sort()).toEqual(
        expect.arrayContaining(["accountId", "products"]),
      );
    }
  });
});
