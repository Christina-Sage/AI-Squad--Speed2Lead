import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  getSalesforceProvider,
  detectSearchType,
  detectLeadSearchType,
} from "@/lib/salesforce/provider";
import { getDemoUser, DEMO_USER_COOKIE } from "@/lib/auth/demo-user";
import { getCurrentTeam, TEAM_COOKIE } from "@/lib/teams";
import { writeAuditLog } from "@/lib/audit/audit-log";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const query = typeof body?.query === "string" ? body.query.trim() : "";

  if (!query) {
    return NextResponse.json({ error: "query is required" }, { status: 400 });
  }

  const provider = getSalesforceProvider();
  const cookieStore = await cookies();
  const demoUser = getDemoUser(cookieStore.get(DEMO_USER_COOKIE)?.value);
  const team = getCurrentTeam(cookieStore.get(TEAM_COOKIE)?.value);

  // SDR works Leads — resolve the query against the lead worklist and open the
  // lead. BDR works Accounts — the account path below. A "single" hit skips the
  // audit log (it opens straight into the record), matching the account path.
  if (team === "SDR") {
    const outcome = await provider.searchLeads(query);
    if (outcome.matchType === "single") {
      return NextResponse.json({ matchType: "single", kind: "lead", id: outcome.lead.id });
    }
    await writeAuditLog({
      userId: demoUser.id,
      userName: demoUser.name,
      team,
      searchInput: query,
      searchType: detectLeadSearchType(query),
      action: "SEARCH",
    });
    if (outcome.matchType === "multiple") {
      return NextResponse.json({ matchType: "multiple", kind: "lead", matches: outcome.matches });
    }
    return NextResponse.json({ matchType: "none", kind: "lead" });
  }

  const searchType = detectSearchType(query);
  const outcome = await provider.search(query);

  if (outcome.matchType === "single") {
    return NextResponse.json({ matchType: "single", kind: "account", id: outcome.account.id });
  }

  await writeAuditLog({
    userId: demoUser.id,
    userName: demoUser.name,
    team,
    searchInput: query,
    searchType,
    action: "SEARCH",
  });

  if (outcome.matchType === "multiple") {
    return NextResponse.json({ matchType: "multiple", kind: "account", matches: outcome.matches });
  }

  return NextResponse.json({ matchType: "none", kind: "account" });
}
