import { describe, it, expect } from "vitest";
import {
  accountFields,
  activityFields,
  contactFields,
  opportunityFields,
  salesforceLeadFields,
  sdrLeadFields,
} from "@/convex/validators";
import { ACCOUNTS } from "./accounts";
import { LEADS } from "./leads";
import { CONTACTS } from "./contacts";
import { OPPORTUNITIES } from "./opportunities";
import { ACTIVITIES } from "./activities";
import { SDR_LEADS } from "./sdr-leads";

// Guards the fixtures -> Convex seed boundary that a live deployment would
// otherwise be the first to enforce. Two failure modes are caught here:
//   1. Convex `v.object(...)` is strict — a fixture key outside the validator's
//      field set is rejected at seed time.
//   2. Convex `v.optional(...)` accepts an absent key but rejects an explicit
//      `undefined`; the seed route strips undefined via a JSON round-trip, so
//      we assert the cleaned fixtures contain no `undefined` at any depth.
// Mirrors the `clean()` in app/api/dev/seed/route.ts.
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

const TABLES = [
  { name: "accounts", rows: ACCOUNTS, fields: accountFields },
  { name: "salesforceLeads", rows: LEADS, fields: salesforceLeadFields },
  { name: "contacts", rows: CONTACTS, fields: contactFields },
  { name: "opportunities", rows: OPPORTUNITIES, fields: opportunityFields },
  { name: "activities", rows: ACTIVITIES, fields: activityFields },
  { name: "sdrLeads", rows: SDR_LEADS, fields: sdrLeadFields },
] as const;

describe("fixtures are Convex-seedable", () => {
  for (const { name, rows, fields } of TABLES) {
    const allowed = new Set(Object.keys(fields));

    it(`${name}: every top-level key is declared in the validator`, () => {
      for (const row of rows) {
        const unknownKeys = Object.keys(row).filter((k) => !allowed.has(k));
        expect(unknownKeys, `${name} row ${(row as { id?: string }).id}`).toEqual([]);
      }
    });

    it(`${name}: no undefined values survive the seed clean()`, () => {
      expect(hasUndefinedDeep(clean(rows as unknown[]))).toBe(false);
    });
  }
});
