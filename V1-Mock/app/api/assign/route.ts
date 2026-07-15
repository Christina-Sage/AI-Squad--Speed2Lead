import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSalesforceProvider } from "@/lib/salesforce/provider";
import { evaluateWorkability } from "@/lib/workability/engine";
import { DEMO_USERS, getDemoUser, DEMO_USER_COOKIE } from "@/lib/auth/demo-user";
import { getCurrentTeam, TEAM_COOKIE } from "@/lib/teams";
import { writeAuditLog } from "@/lib/audit/audit-log";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const accountId = typeof body?.accountId === "string" ? body.accountId : "";
  const requestedOwnerId = typeof body?.ownerId === "string" ? body.ownerId : undefined;

  if (!accountId) {
    return NextResponse.json({ success: false, error: "accountId is required" }, { status: 400 });
  }

  const provider = getSalesforceProvider();
  const bundle = await provider.getAccountBundle(accountId);
  if (!bundle) {
    return NextResponse.json({ success: false, error: "Account not found" }, { status: 404 });
  }

  const cookieStore = await cookies();
  const demoUser = getDemoUser(cookieStore.get(DEMO_USER_COOKIE)?.value);
  const team = getCurrentTeam(cookieStore.get(TEAM_COOKIE)?.value);

  const isReassignment = requestedOwnerId !== undefined;
  const targetUser = isReassignment
    ? DEMO_USERS.find((u) => u.id === requestedOwnerId)
    : demoUser;

  if (!targetUser) {
    return NextResponse.json({ success: false, error: "Unknown user" }, { status: 400 });
  }

  const result = evaluateWorkability(bundle, team);
  if (result.final_status === "NOT WORKABLE") {
    return NextResponse.json(
      { success: false, error: "Account is NOT WORKABLE and cannot be assigned." },
      { status: 409 },
    );
  }

  const previousOwner = bundle.account.ownerName;
  const previousNurtureStatus = bundle.account.abmNurtureStatus;

  const updated = await provider.assignToMe(accountId, targetUser.id, targetUser.name);

  await writeAuditLog({
    userId: demoUser.id,
    userName: demoUser.name,
    team,
    searchInput: accountId,
    searchType: "global_account_id",
    accountId: updated.id,
    domain: updated.domain,
    accountName: updated.name,
    finalStatus: result.final_status,
    reason: result.reason,
    reasonCodes: result.reason_codes,
    action: isReassignment ? "ASSIGN_OWNER" : "ASSIGN_TO_ME",
    assignmentDetails: {
      previousOwner,
      newOwner: updated.ownerName,
      previousNurtureStatus,
      newNurtureStatus: updated.abmNurtureStatus,
      assignedBy: demoUser.name,
    },
  });

  return NextResponse.json({
    success: true,
    account: {
      id: updated.id,
      ownerId: updated.ownerId,
      ownerName: updated.ownerName,
      abmNurtureStatus: updated.abmNurtureStatus,
    },
  });
}
