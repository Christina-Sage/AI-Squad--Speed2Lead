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
import { DEMO_USERS } from "@/lib/auth/demo-user";
import {
  EXAMPLE_SAVED_WORKLISTS,
  EXAMPLE_WORKED_ACCOUNT_IDS,
  EXAMPLE_WORKLIST_ACCOUNTS,
  exampleWorklistId,
} from "@/lib/worklists/mock/example-worklists";

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

  // Example Saved Worklists (per-user demo data). Seeded for every demo user so
  // the picker is populated whoever is signed in. createdAt/expiresAt are
  // computed here (the mutation avoids wall-clock reads); the small decreasing
  // createdAt offset preserves the definition order (first list shown newest).
  const now = Date.now();
  const DAY_MS = 24 * 60 * 60 * 1000;
  // Worked entries are backdated so they populate lifetime progress (the picker)
  // without landing in any user's daily worked-today set.
  const workedAtMs = now - 2 * DAY_MS;
  const accountNameById = new Map(EXAMPLE_WORKLIST_ACCOUNTS.map((a) => [a.id, a.name]));
  const workedAccounts = EXAMPLE_WORKED_ACCOUNT_IDS.map((id) => ({
    accountId: id,
    accountName: accountNameById.get(id) ?? null,
  }));

  let savedWorklistRows = 0;
  let workedRows = 0;
  for (const user of DEMO_USERS) {
    const worklists = EXAMPLE_SAVED_WORKLISTS.map((wl, i) => ({
      id: exampleWorklistId(wl.key, user.id),
      name: wl.name,
      source: wl.source,
      accountIds: wl.accountIds,
      createdAt: now - i * 1000,
      expiresAt: wl.expiresInDays !== null ? now + wl.expiresInDays * DAY_MS : null,
    }));
    const res = await fetchMutation(api.savedWorklists.seedExamples, { userId: user.id, worklists });
    savedWorklistRows += res.inserted;

    const workedRes = await fetchMutation(api.auditLog.seedWorked, {
      userId: user.id,
      userName: user.name,
      team: "BDR",
      createdAt: workedAtMs,
      accounts: workedAccounts,
    });
    workedRows += workedRes.inserted;
  }

  return NextResponse.json({
    success: true,
    seeded: {
      ...results,
      savedWorklists: { inserted: savedWorklistRows },
      workedSeed: { inserted: workedRows },
    },
  });
}
