import { NextResponse } from "next/server";
import { fetchMutation } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { ACCOUNTS } from "@/lib/salesforce/mock/fixtures/accounts";
import { LEADS } from "@/lib/salesforce/mock/fixtures/leads";
import { CONTACTS } from "@/lib/salesforce/mock/fixtures/contacts";
import { OPPORTUNITIES } from "@/lib/salesforce/mock/fixtures/opportunities";
import { ACTIVITIES } from "@/lib/salesforce/mock/fixtures/activities";
import { SDR_LEADS } from "@/lib/salesforce/mock/fixtures/sdr-leads";

// Loads the in-memory mock fixtures into Convex so the `convex` Salesforce
// provider has data to run the de-dupe engine against. Idempotent: each table's
// `replaceAll` mutation wipes and reloads, so re-seeding resets to fixtures.
//
// Guarded so it can't wipe a real dataset by accident:
//   - `ALLOW_DEV_SEED=1` must be set (opt-in), and
//   - the app must be pointed at the Convex provider (`SALESFORCE_PROVIDER=convex`).
//
// Run it from `pnpm seed:convex` (which POSTs here against the dev server) or
// with: curl -X POST http://localhost:3000/api/dev/seed

// JSON round-trip drops keys whose value is `undefined` (e.g. an SDR lead's
// `industry: undefined`). Convex's `v.optional(...)` accepts an absent key but
// rejects an explicit `undefined`, so this normalization is required before the
// fixtures are handed to the seed mutations.
function clean<T>(rows: T[]): T[] {
  return JSON.parse(JSON.stringify(rows));
}

export async function POST() {
  if (process.env.ALLOW_DEV_SEED !== "1") {
    return NextResponse.json(
      { success: false, error: "Seeding disabled. Set ALLOW_DEV_SEED=1 to enable." },
      { status: 403 },
    );
  }
  if ((process.env.SALESFORCE_PROVIDER ?? "mock") !== "convex") {
    return NextResponse.json(
      {
        success: false,
        error: "Set SALESFORCE_PROVIDER=convex before seeding so the app reads the seeded data.",
      },
      { status: 400 },
    );
  }

  const results = {
    accounts: await fetchMutation(api.accounts.replaceAll, { rows: clean(ACCOUNTS) }),
    salesforceLeads: await fetchMutation(api.salesforceLeads.replaceAll, { rows: clean(LEADS) }),
    contacts: await fetchMutation(api.contacts.replaceAll, { rows: clean(CONTACTS) }),
    opportunities: await fetchMutation(api.opportunities.replaceAll, {
      rows: clean(OPPORTUNITIES),
    }),
    activities: await fetchMutation(api.activities.replaceAll, { rows: clean(ACTIVITIES) }),
    sdrLeads: await fetchMutation(api.sdrLeads.replaceAll, { rows: clean(SDR_LEADS) }),
  };

  return NextResponse.json({ success: true, seeded: results });
}
