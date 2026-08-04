import { NextResponse } from "next/server";
import { ACCOUNTS } from "@/lib/salesforce/mock/fixtures/accounts";
import { LEADS } from "@/lib/salesforce/mock/fixtures/leads";
import { CONTACTS } from "@/lib/salesforce/mock/fixtures/contacts";
import { OPPORTUNITIES } from "@/lib/salesforce/mock/fixtures/opportunities";
import { ACTIVITIES } from "@/lib/salesforce/mock/fixtures/activities";
import { decomposeToSourceTables } from "@/lib/salesforce/source-tables";

// Read-only dev utility: returns the in-memory dummy fixtures decomposed into
// the ten source tables — exactly the rows the Convex seed would load. Lets the
// team export/inspect the table-formatted data WITHOUT standing up Convex.
// `pnpm dump:source-tables` writes this to docs/source-tables/*.json.
//
// Dev-only: never served from a production build (the fixtures are dummy data,
// but there's no reason to expose the endpoint in prod).
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Not available in production." },
      { status: 404 },
    );
  }

  const src = decomposeToSourceTables(ACCOUNTS, LEADS, CONTACTS, OPPORTUNITIES, ACTIVITIES);
  const counts = Object.fromEntries(
    Object.entries(src).map(([table, rows]) => [table, (rows as unknown[]).length]),
  );
  return NextResponse.json({ counts, tables: src });
}
