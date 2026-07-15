import { NextResponse } from "next/server";
import { getSalesforceProvider } from "@/lib/salesforce/provider";
import { ABM_ACCOUNT_STATUSES } from "@/lib/abm-status";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const accountId = typeof body?.accountId === "string" ? body.accountId : "";
  const status: string | null = body?.status === null ? null : typeof body?.status === "string" ? body.status : undefined;

  if (!accountId) {
    return NextResponse.json({ success: false, error: "accountId is required" }, { status: 400 });
  }
  if (status !== null && (status === undefined || !ABM_ACCOUNT_STATUSES.includes(status))) {
    return NextResponse.json({ success: false, error: "Unknown ABM Account Status" }, { status: 400 });
  }

  const provider = getSalesforceProvider();
  const bundle = await provider.getAccountBundle(accountId);
  if (!bundle) {
    return NextResponse.json({ success: false, error: "Account not found" }, { status: 404 });
  }

  const updated = await provider.updateAbmStatus(accountId, status);

  return NextResponse.json({
    success: true,
    account: { id: updated.id, abmNurtureStatus: updated.abmNurtureStatus },
  });
}
