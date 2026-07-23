import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSalesforceProvider } from "@/lib/salesforce/provider";
import { getDemoUser, DEMO_USER_COOKIE } from "@/lib/auth/demo-user";
import { getCurrentTeam, TEAM_COOKIE } from "@/lib/teams";
import { writeAuditLog } from "@/lib/audit/audit-log";
import { resolveWorkItTarget } from "@/lib/workit/work-it-target";
import { SEQUENCES } from "@/lib/outreach";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const accountId = typeof body?.accountId === "string" ? body.accountId : "";
  const sequence = typeof body?.sequence === "string" ? body.sequence : "";
  const contactNames: string[] = Array.isArray(body?.contactNames)
    ? body.contactNames.filter((n: unknown): n is string => typeof n === "string" && n.trim() !== "")
    : [];

  if (!accountId) {
    return NextResponse.json({ success: false, error: "accountId is required" }, { status: 400 });
  }
  if (!SEQUENCES.includes(sequence)) {
    return NextResponse.json({ success: false, error: "Unknown sequence" }, { status: 400 });
  }
  if (contactNames.length === 0) {
    return NextResponse.json(
      { success: false, error: "Select at least one contact to push" },
      { status: 400 },
    );
  }

  const provider = getSalesforceProvider();
  const target = await resolveWorkItTarget(provider, accountId);
  if (!target) {
    return NextResponse.json({ success: false, error: "Account or lead not found" }, { status: 404 });
  }

  const cookieStore = await cookies();
  const demoUser = getDemoUser(cookieStore.get(DEMO_USER_COOKIE)?.value);
  const team = getCurrentTeam(cookieStore.get(TEAM_COOKIE)?.value);

  const push = {
    sequence,
    contactNames,
    pushedBy: demoUser.name,
    pushedAt: new Date().toISOString(),
  };
  await provider.pushToOutreach(accountId, push);

  await writeAuditLog({
    userId: demoUser.id,
    userName: demoUser.name,
    team,
    searchInput: accountId,
    searchType: "global_account_id",
    accountId,
    domain: target.domain,
    accountName: target.name,
    action: "PUSH_OUTREACH",
    assignmentDetails: push,
  });

  return NextResponse.json({ success: true, push });
}
