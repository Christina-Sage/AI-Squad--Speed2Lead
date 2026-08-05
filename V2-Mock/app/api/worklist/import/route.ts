import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSalesforceProvider } from "@/lib/salesforce/provider";
import { getCurrentTeam, TEAM_COOKIE } from "@/lib/teams";
import { resolveAccountIdentifiers, resolveLeadIdentifiers } from "@/lib/worklist/resolve";
import { buildAccountRows, buildLeadRows } from "@/lib/worklist/build";

// Builds a worklist from an uploaded/pasted identifier list. Unlike a client
// filter, this resolves the identifiers against the database (Convex under the
// `convex` provider, the in-memory fixtures under `mock`), runs the SAME
// de-dupe verdict + scoring as the home page, and returns ranked rows plus a
// report of anything that didn't resolve. The worklist then REPLACES the
// preloaded demo until the rep resets.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const identifiers: string[] = Array.isArray(body?.identifiers)
    ? body.identifiers.filter((x: unknown): x is string => typeof x === "string")
    : [];
  const mode = body?.mode === "leads" ? "leads" : "accounts";

  if (identifiers.length === 0) {
    return NextResponse.json({ error: "No identifiers provided." }, { status: 400 });
  }

  const provider = getSalesforceProvider();
  const cookieStore = await cookies();
  const team = getCurrentTeam(cookieStore.get(TEAM_COOKIE)?.value);

  if (mode === "leads") {
    const all = await provider.listSdrLeads();
    const { matched, notFound } = resolveLeadIdentifiers(identifiers, all);
    const { rows, blocked } = await buildLeadRows(provider, matched, team, all);
    return NextResponse.json({
      mode,
      leadRows: rows,
      blockedLeadRows: blocked,
      report: { total: identifiers.length, matched: matched.length, notFound },
    });
  }

  const all = await provider.listAccounts();
  const { matched, notFound } = resolveAccountIdentifiers(identifiers, all);
  const { rows, blocked } = await buildAccountRows(provider, matched, team);
  return NextResponse.json({
    mode,
    accountRows: rows,
    blockedRows: blocked,
    report: { total: identifiers.length, matched: matched.length, notFound },
  });
}
