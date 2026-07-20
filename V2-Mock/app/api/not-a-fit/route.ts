import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSalesforceProvider } from "@/lib/salesforce/provider";
import { getDemoUser, DEMO_USER_COOKIE } from "@/lib/auth/demo-user";
import { getCurrentTeam, TEAM_COOKIE } from "@/lib/teams";
import { writeAuditLog } from "@/lib/audit/audit-log";
import { NOT_A_FIT_REASONS } from "@/lib/workit/not-a-fit";

/**
 * Marks an account "Not a Fit" for today. Records a NOT_A_FIT audit entry with
 * the reason; the home worklist derives worked-state from these entries.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const accountId = typeof body?.accountId === "string" ? body.accountId : "";
  const reason = typeof body?.reason === "string" ? body.reason : "";

  if (!accountId) {
    return NextResponse.json({ success: false, error: "accountId is required" }, { status: 400 });
  }
  if (!NOT_A_FIT_REASONS.includes(reason)) {
    return NextResponse.json({ success: false, error: "Unknown reason" }, { status: 400 });
  }

  const provider = getSalesforceProvider();
  const bundle = await provider.getAccountBundle(accountId);
  if (!bundle) {
    return NextResponse.json({ success: false, error: "Account not found" }, { status: 404 });
  }

  const cookieStore = await cookies();
  const demoUser = getDemoUser(cookieStore.get(DEMO_USER_COOKIE)?.value);
  const team = getCurrentTeam(cookieStore.get(TEAM_COOKIE)?.value);

  await writeAuditLog({
    userId: demoUser.id,
    userName: demoUser.name,
    team,
    searchInput: accountId,
    searchType: "global_account_id",
    accountId,
    domain: bundle.account.domain,
    accountName: bundle.account.name,
    action: "NOT_A_FIT",
    reason,
  });

  return NextResponse.json({ success: true });
}
