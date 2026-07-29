import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSalesforceProvider } from "@/lib/salesforce/provider";
import { getDemoUser, DEMO_USER_COOKIE } from "@/lib/auth/demo-user";
import { getCurrentTeam, TEAM_COOKIE } from "@/lib/teams";
import { writeAuditLog } from "@/lib/audit/audit-log";
import { resolveWorkItTarget } from "@/lib/workit/work-it-target";
import { ARCHIVE_STATUS_REASONS, OTHER_ARCHIVE_REASON } from "@/lib/workit/archive-lead";

/**
 * SDR-only: archive a lead with a Status Reason (and optional Other Archive
 * Reason detail). Records an ARCHIVE_LEAD audit entry; the home worklist
 * derives worked-state from it and drops the lead — no outreach sent.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const accountId = typeof body?.accountId === "string" ? body.accountId : "";
  const reason = typeof body?.reason === "string" ? body.reason : "";
  const otherReason = typeof body?.otherReason === "string" ? body.otherReason.trim() : "";

  if (!accountId) {
    return NextResponse.json({ success: false, error: "accountId is required" }, { status: 400 });
  }
  if (!ARCHIVE_STATUS_REASONS.includes(reason)) {
    return NextResponse.json({ success: false, error: "Unknown status reason" }, { status: 400 });
  }
  if (reason === OTHER_ARCHIVE_REASON && otherReason === "") {
    return NextResponse.json(
      { success: false, error: "Other Archive Reason is required" },
      { status: 400 },
    );
  }

  const provider = getSalesforceProvider();
  const target = await resolveWorkItTarget(provider, accountId);
  if (!target) {
    return NextResponse.json({ success: false, error: "Lead not found" }, { status: 404 });
  }

  const cookieStore = await cookies();
  const demoUser = getDemoUser(cookieStore.get(DEMO_USER_COOKIE)?.value);
  const team = getCurrentTeam(cookieStore.get(TEAM_COOKIE)?.value);

  // Fold the free-text detail into the logged reason so the worklist badge and
  // audit trail carry it.
  const loggedReason = otherReason ? `${reason} — ${otherReason}` : reason;

  await writeAuditLog({
    userId: demoUser.id,
    userName: demoUser.name,
    team,
    searchInput: accountId,
    searchType: "global_account_id",
    accountId,
    domain: target.domain,
    accountName: target.name,
    action: "ARCHIVE_LEAD",
    finalStatus: "Archived",
    reason: loggedReason,
  });

  return NextResponse.json({ success: true });
}
