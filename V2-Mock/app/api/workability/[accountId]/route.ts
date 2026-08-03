import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSalesforceProvider, buildSalesforceAccountUrl } from "@/lib/salesforce/provider";
import { evaluateWorkability } from "@/lib/workability/engine";
import { ENGINE_OWNED_ABM_STATUSES } from "@/lib/workability/abm-recommendation";
import { scoreAccount } from "@/lib/scoring/scoring";
import { getCurrentTeam, TEAM_COOKIE } from "@/lib/teams";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ accountId: string }> },
) {
  const { accountId } = await params;
  const provider = getSalesforceProvider();
  const bundle = await provider.getAccountBundle(accountId);

  if (!bundle) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  const cookieStore = await cookies();
  const team = getCurrentTeam(cookieStore.get(TEAM_COOKIE)?.value);

  const duplicates = await provider.findDuplicateAccounts(accountId);
  const result = evaluateWorkability(bundle, team, duplicates);

  // Blocked-by-de-dupe → the engine owns the ABM Account Nurture Status
  // (Current Customer / Duplicate Account / Incorrect Vertical). Persist it, but
  // never clobber a rep-set disposition: only overwrite a blank status or one the
  // engine itself owns. Idempotent — skips when it already matches.
  const current = bundle.account.abmNurtureStatus;
  const recommended = result.recommended_abm_status;
  if (
    recommended &&
    recommended !== current &&
    (current === null || ENGINE_OWNED_ABM_STATUSES.includes(current))
  ) {
    await provider.updateAbmStatus(accountId, recommended);
    result.abm_nurture_status = recommended;
  }

  const score = scoreAccount(bundle, result);
  // Returns result + score + CRM URL so the inline feed renders the same shared
  // AccountDetailView as the standalone route (build-plan step 7).
  return NextResponse.json({ result, score, salesforceUrl: buildSalesforceAccountUrl(accountId) });
}
