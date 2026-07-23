import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSalesforceProvider } from "@/lib/salesforce/provider";
import { getDemoUser, DEMO_USER_COOKIE } from "@/lib/auth/demo-user";
import { getCurrentTeam, TEAM_COOKIE } from "@/lib/teams";
import { writeAuditLog } from "@/lib/audit/audit-log";
import { resolveWorkItTarget } from "@/lib/workit/work-it-target";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const accountId = typeof body?.accountId === "string" ? body.accountId : "";
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim() : undefined;

  if (!accountId || !name || !title) {
    return NextResponse.json(
      { success: false, error: "accountId, name, and title are required" },
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

  const contact = await provider.addContact(accountId, { name, title, email }, demoUser.id, demoUser.name);

  await writeAuditLog({
    userId: demoUser.id,
    userName: demoUser.name,
    team,
    searchInput: accountId,
    searchType: "global_account_id",
    accountId,
    domain: target.domain,
    accountName: target.name,
    action: "ADD_CONTACT",
    assignmentDetails: { contactName: name, contactTitle: title, contactEmail: email ?? null },
  });

  return NextResponse.json({ success: true, contact: { id: contact.id, name: contact.name } });
}
