import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDemoUser, DEMO_USER_COOKIE } from "@/lib/auth/demo-user";
import { createSavedWorklist, SAVED_WORKLIST_COOKIE } from "@/lib/worklists/saved";

/**
 * Save the current worklist as a named, expiring saved list (per-user), then
 * select it. Body: { name, accountIds, expiresAt?, source? }.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const accountIds: string[] = Array.isArray(body?.accountIds)
    ? body.accountIds.filter((id: unknown): id is string => typeof id === "string")
    : [];
  const expiresAt = typeof body?.expiresAt === "string" && body.expiresAt ? body.expiresAt : null;
  const source = typeof body?.source === "string" && body.source ? body.source : null;

  if (!name) {
    return NextResponse.json({ error: "A list name is required" }, { status: 400 });
  }
  if (accountIds.length === 0) {
    return NextResponse.json({ error: "The worklist is empty — nothing to save" }, { status: 400 });
  }
  if (expiresAt && Number.isNaN(new Date(expiresAt).getTime())) {
    return NextResponse.json({ error: "Invalid expiration date" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const demoUser = getDemoUser(cookieStore.get(DEMO_USER_COOKIE)?.value);

  const id = await createSavedWorklist(demoUser.id, { name, accountIds, expiresAt, source });
  cookieStore.set(SAVED_WORKLIST_COOKIE, id, { path: "/" });

  return NextResponse.json({ success: true, id });
}
