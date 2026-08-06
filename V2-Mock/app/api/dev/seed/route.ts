import { NextResponse } from "next/server";
import { fetchMutation } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { ACCOUNTS } from "@/lib/salesforce/mock/fixtures/accounts";
import { LEADS } from "@/lib/salesforce/mock/fixtures/leads";
import { CONTACTS } from "@/lib/salesforce/mock/fixtures/contacts";
import { OPPORTUNITIES } from "@/lib/salesforce/mock/fixtures/opportunities";
import { ACTIVITIES } from "@/lib/salesforce/mock/fixtures/activities";
import { SDR_LEADS } from "@/lib/salesforce/mock/fixtures/sdr-leads";
import { decomposeToSourceTables } from "@/lib/salesforce/source-tables";

// Loads the in-memory mock fixtures into Convex so the `convex` Salesforce
// provider has data to run the de-dupe engine against. The embedded fixtures are
// decomposed into the ten real source tables (GMO ×5, Intacct SF ×4, Fusion ×1);
// the provider reassembles them into the embedded Account shape on read.
// Idempotent: each table's `replaceAll` wipes and reloads.
//
// Guarded so it can't wipe a real dataset by accident:
//   - `ALLOW_DEV_SEED=1` must be set (opt-in), and
//   - the app must be pointed at the Convex provider (`SALESFORCE_PROVIDER=convex`).
//
// Run it from `pnpm seed:convex` (which POSTs here against the dev server) or
// with: curl -X POST http://localhost:3000/api/dev/seed

// JSON round-trip drops keys whose value is `undefined`. Convex's
// `v.optional(...)` accepts an absent key but rejects an explicit `undefined`,
// so this normalization is required before the fixtures are seeded.
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

  const src = decomposeToSourceTables(ACCOUNTS, LEADS, CONTACTS, OPPORTUNITIES, ACTIVITIES);

  const results = {
    // GMO Salesforce
    gmoAccounts: await fetchMutation(api.gmoAccounts.replaceAll, { rows: clean(src.gmoAccounts) }),
    gmoLeads: await fetchMutation(api.gmoLeads.replaceAll, { rows: clean(src.gmoLeads) }),
    gmoContacts: await fetchMutation(api.gmoContacts.replaceAll, { rows: clean(src.gmoContacts) }),
    gmoOpportunities: await fetchMutation(api.gmoOpportunities.replaceAll, {
      rows: clean(src.gmoOpportunities),
    }),
    gmoActivities: await fetchMutation(api.gmoActivities.replaceAll, {
      rows: clean(src.gmoActivities),
    }),
    // Intacct Salesforce
    intacctAccounts: await fetchMutation(api.intacctAccounts.replaceAll, {
      rows: clean(src.intacctAccounts),
    }),
    intacctContacts: await fetchMutation(api.intacctContacts.replaceAll, {
      rows: clean(src.intacctContacts),
    }),
    intacctOpportunities: await fetchMutation(api.intacctOpportunities.replaceAll, {
      rows: clean(src.intacctOpportunities),
    }),
    intacctActivities: await fetchMutation(api.intacctActivities.replaceAll, {
      rows: clean(src.intacctActivities),
    }),
    // SAP Fusion (customer + partner only)
    fusionAccounts: await fetchMutation(api.fusionAccounts.replaceAll, {
      rows: clean(src.fusionAccounts),
    }),
    // Non-CRM
    sdrLeads: await fetchMutation(api.sdrLeads.replaceAll, { rows: clean(SDR_LEADS) }),
  };

  // NOTE: the example Saved Worklists (Tradeshow — Money20/20, BMS Upsell,
  // ABX MV Dental) and their pre-worked audit entries are no longer seeded here.
  // They're in-memory demo data now (see lib/worklists/saved.ts →
  // buildExampleWorklistViews), so they show in the picker without Convex or the
  // seed route. This route only loads the CRM source tables + sdrLeads.

  return NextResponse.json({ success: true, seeded: results });
}
