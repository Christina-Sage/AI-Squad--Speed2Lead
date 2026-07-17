import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { PRIORITY_COOKIE, PRIORITIES } from "@/lib/priority";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const priority = typeof body?.priority === "string" ? body.priority : "";

  if (!PRIORITIES.some((p) => p.id === priority)) {
    return NextResponse.json({ error: "Unknown priority" }, { status: 400 });
  }

  const cookieStore = await cookies();
  cookieStore.set(PRIORITY_COOKIE, priority, { path: "/" });
  return NextResponse.json({ success: true });
}
