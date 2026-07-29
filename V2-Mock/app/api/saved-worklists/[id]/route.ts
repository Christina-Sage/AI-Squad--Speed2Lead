import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDemoUser, DEMO_USER_COOKIE } from "@/lib/auth/demo-user";
import {
  archiveSavedWorklist,
  reopenSavedWorklist,
  deleteSavedWorklist,
  SAVED_WORKLIST_COOKIE,
} from "@/lib/worklists/saved";

/**
 * Mutate one saved worklist. Body: { action: "archive" | "reopen" | "delete" }.
 * archive/delete on the currently selected list resets the selection to All.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const action = typeof body?.action === "string" ? body.action : "";

  const cookieStore = await cookies();
  const demoUser = getDemoUser(cookieStore.get(DEMO_USER_COOKIE)?.value);

  switch (action) {
    case "archive":
      await archiveSavedWorklist(demoUser.id, id);
      break;
    case "reopen":
      await reopenSavedWorklist(demoUser.id, id);
      break;
    case "delete":
      await deleteSavedWorklist(demoUser.id, id);
      break;
    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  // Leaving a list you were viewing shouldn't strand the worklist on it.
  if (action !== "reopen" && cookieStore.get(SAVED_WORKLIST_COOKIE)?.value === id) {
    cookieStore.set(SAVED_WORKLIST_COOKIE, "all", { path: "/" });
  }

  return NextResponse.json({ success: true });
}
