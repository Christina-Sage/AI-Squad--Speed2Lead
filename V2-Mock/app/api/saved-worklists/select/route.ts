import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SAVED_WORKLIST_COOKIE } from "@/lib/worklists/saved";

/**
 * Switch the active saved worklist. Body: { id } — a saved-list id, or "all"
 * to return to the full worklist. Persisted in a cookie like the other switchers.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const id = typeof body?.id === "string" && body.id ? body.id : "all";

  const cookieStore = await cookies();
  cookieStore.set(SAVED_WORKLIST_COOKIE, id, { path: "/" });

  return NextResponse.json({ success: true });
}
