import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSalesforceProvider } from "@/lib/salesforce/provider";
import { getDemoUser, DEMO_USER_COOKIE } from "@/lib/auth/demo-user";
import { getCurrentTeam, TEAM_COOKIE } from "@/lib/teams";
import { writeAuditLog } from "@/lib/audit/audit-log";
import { resolveWorkItTarget } from "@/lib/workit/work-it-target";
import { SEQUENCES } from "@/lib/outreach";
import { isOutreachConfigured } from "@/lib/integrations/config";
import { pushProspectsToSequence } from "@/lib/integrations/outreach";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const accountId = typeof body?.accountId === "string" ? body.accountId : "";
  const sequence = typeof body?.sequence === "string" ? body.sequence : "";
  const contactNames: string[] = Array.isArray(body?.contactNames)
    ? body.contactNames.filter((n: unknown): n is string => typeof n === "string" && n.trim() !== "")
    : [];
  // Optional richer payload for the real Outreach push: prospects need an
  // email to be created/found. When absent, the mock/local path still runs.
  const contacts: { name: string; email: string }[] = Array.isArray(body?.contacts)
    ? body.contacts
        .filter(
          (c: unknown): c is { name: string; email: string } =>
            typeof c === "object" &&
            c !== null &&
            typeof (c as { name?: unknown }).name === "string" &&
            typeof (c as { email?: unknown }).email === "string" &&
            (c as { email: string }).email.trim() !== "",
        )
        .map((c: { name: string; email: string }) => ({ name: c.name, email: c.email }))
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

  // Real Outreach push when credentials are configured; enrolls the prospects
  // that carry an email. Failures here don't fail the request — the local
  // record + audit above are the source of truth for the demo.
  let enrolled: number | null = null;
  if (isOutreachConfigured() && contacts.length > 0) {
    try {
      const result = await pushProspectsToSequence(sequence, contacts);
      enrolled = result.enrolled;
    } catch (err) {
      console.error("Outreach live push failed; kept local record only:", err);
    }
  }

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

  return NextResponse.json({ success: true, push, enrolled });
}
