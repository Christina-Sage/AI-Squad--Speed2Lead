import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSalesforceProvider } from "@/lib/salesforce/provider";
import { evaluateWorkability } from "@/lib/workability/engine";
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

  const result = evaluateWorkability(bundle, team);
  return NextResponse.json(result);
}
