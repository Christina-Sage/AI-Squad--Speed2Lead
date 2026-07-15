import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSalesforceProvider } from "@/lib/salesforce/provider";
import { getDemoUser, DEMO_USER_COOKIE } from "@/lib/auth/demo-user";
import { getCurrentTeam, TEAM_COOKIE } from "@/lib/teams";
import { writeAuditLog } from "@/lib/audit/audit-log";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const accountId = typeof body?.accountId === "string" ? body.accountId : "";
  const field = typeof body?.field === "string" ? body.field.trim() : "";
  const newValue = typeof body?.newValue === "string" ? body.newValue : null;

  if (!accountId || !field) {
    return NextResponse.json(
      { success: false, error: "accountId and field are required" },
      { status: 400 },
    );
  }

  const provider = getSalesforceProvider();
  const bundle = await provider.getAccountBundle(accountId);
  if (!bundle) {
    return NextResponse.json({ success: false, error: "Account not found" }, { status: 404 });
  }

  const cookieStore = await cookies();
  const demoUser = getDemoUser(cookieStore.get(DEMO_USER_COOKIE)?.value);
  const team = getCurrentTeam(cookieStore.get(TEAM_COOKIE)?.value);

  await provider.applyHygieneField(accountId, field);

  await writeAuditLog({
    userId: demoUser.id,
    userName: demoUser.name,
    team,
    searchInput: accountId,
    searchType: "global_account_id",
    accountId,
    domain: bundle.account.domain,
    accountName: bundle.account.name,
    action: "APPLY_HYGIENE",
    assignmentDetails: { field, newValue },
  });

  return NextResponse.json({ success: true });
}
