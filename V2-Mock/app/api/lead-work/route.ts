import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSalesforceProvider } from "@/lib/salesforce/provider";
import { getDemoUser, DEMO_USER_COOKIE } from "@/lib/auth/demo-user";
import { getCurrentTeam, TEAM_COOKIE } from "@/lib/teams";
import { writeAuditLog } from "@/lib/audit/audit-log";
import { SEQUENCES } from "@/lib/outreach";
import { NOT_A_FIT_REASONS } from "@/lib/workit/not-a-fit";

/**
 * Work a single SDR lead: push it to a sequence, or mark it Not a Fit. Either
 * way it's logged against the lead id so the SDR worklist marks it worked.
 * Used for leads with no linked account (freemail); linked leads work the
 * account view instead.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const leadId = typeof body?.leadId === "string" ? body.leadId : "";
  const action = body?.action === "push" || body?.action === "not_fit" ? body.action : "";
  const sequence = typeof body?.sequence === "string" ? body.sequence : "";
  const reason = typeof body?.reason === "string" ? body.reason : "";

  if (!leadId) {
    return NextResponse.json({ success: false, error: "leadId is required" }, { status: 400 });
  }
  if (!action) {
    return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
  }
  if (action === "push" && !SEQUENCES.includes(sequence)) {
    return NextResponse.json({ success: false, error: "Unknown sequence" }, { status: 400 });
  }
  if (action === "not_fit" && !NOT_A_FIT_REASONS.includes(reason)) {
    return NextResponse.json({ success: false, error: "Unknown reason" }, { status: 400 });
  }

  const provider = getSalesforceProvider();
  const bundle = await provider.getSdrLeadBundle(leadId);
  if (!bundle) {
    return NextResponse.json({ success: false, error: "Lead not found" }, { status: 404 });
  }
  const { lead, accountBundle } = bundle;

  const cookieStore = await cookies();
  const demoUser = getDemoUser(cookieStore.get(DEMO_USER_COOKIE)?.value);
  const team = getCurrentTeam(cookieStore.get(TEAM_COOKIE)?.value);

  // The worked entity is the lead — store its id in accountId so getWorkedToday
  // keys on it (lead ids and account ids are distinct namespaces).
  await writeAuditLog({
    userId: demoUser.id,
    userName: demoUser.name,
    team,
    searchInput: leadId,
    searchType: "global_account_id",
    accountId: leadId,
    domain: accountBundle?.account.domain ?? null,
    accountName: lead.name,
    action: action === "push" ? "PUSH_OUTREACH" : "NOT_A_FIT",
    reason: action === "not_fit" ? reason : null,
    assignmentDetails: action === "push" ? { sequence, leadName: lead.name } : null,
  });

  return NextResponse.json({ success: true });
}
