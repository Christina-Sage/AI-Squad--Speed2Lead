import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSalesforceProvider, detectSearchType } from "@/lib/salesforce/provider";
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
  const searchType = detectSearchType(query);
  const outcome = await provider.search(query);

  const cookieStore = await cookies();
  const demoUser = getDemoUser(cookieStore.get(DEMO_USER_COOKIE)?.value);
  const team = getCurrentTeam(cookieStore.get(TEAM_COOKIE)?.value);

  if (outcome.matchType === "single") {
    return NextResponse.json({ matchType: "single", accountId: outcome.account.id });
  }

  if (outcome.matchType === "multiple") {
    await writeAuditLog({
      userId: demoUser.id,
      userName: demoUser.name,
      team,
      searchInput: query,
      searchType,
      action: "SEARCH",
    });
    return NextResponse.json({ matchType: "multiple", matches: outcome.matches });
  }

  await writeAuditLog({
    userId: demoUser.id,
    userName: demoUser.name,
    team,
    searchInput: query,
    searchType,
    action: "SEARCH",
  });
  return NextResponse.json({ matchType: "none" });
}
