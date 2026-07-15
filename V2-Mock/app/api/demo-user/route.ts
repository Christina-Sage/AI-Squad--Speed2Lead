import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { DEMO_USER_COOKIE, DEMO_USERS } from "@/lib/auth/demo-user";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const userId = typeof body?.userId === "string" ? body.userId : "";

  if (!DEMO_USERS.some((u) => u.id === userId)) {
    return NextResponse.json({ error: "Unknown demo user" }, { status: 400 });
  }

  const cookieStore = await cookies();
  cookieStore.set(DEMO_USER_COOKIE, userId, { path: "/" });
  return NextResponse.json({ success: true });
}
