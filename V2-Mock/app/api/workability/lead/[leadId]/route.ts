import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSalesforceProvider, buildSalesforceLeadUrl } from "@/lib/salesforce/provider";
import { evaluateLeadWorkability } from "@/lib/leads/lead-workability";
import { duplicateInfoFor } from "@/lib/leads/lead-dedupe";
import { scoreLead } from "@/lib/leads/lead-scoring";
import { getCurrentTeam, TEAM_COOKIE } from "@/lib/teams";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ leadId: string }> },
) {
  const { leadId } = await params;
  const provider = getSalesforceProvider();
  const bundle = await provider.getSdrLeadBundle(leadId);

  if (!bundle) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  const cookieStore = await cookies();
  const team = getCurrentTeam(cookieStore.get(TEAM_COOKIE)?.value);

  const duplicateInfo = duplicateInfoFor(leadId, await provider.listSdrLeads());
  const result = evaluateLeadWorkability(bundle.lead, bundle.accountBundle, team, duplicateInfo);
  const score = scoreLead(bundle.lead, bundle.accountBundle?.account ?? null);

  return NextResponse.json({ result, score, salesforceUrl: buildSalesforceLeadUrl(leadId) });
}
