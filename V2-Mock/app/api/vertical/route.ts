import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { VERTICAL_COOKIE, VERTICALS } from "@/lib/verticals";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const vertical = typeof body?.vertical === "string" ? body.vertical : "";

  if (!VERTICALS.some((v) => v.id === vertical)) {
    return NextResponse.json({ error: "Unknown vertical" }, { status: 400 });
  }

  const cookieStore = await cookies();
  cookieStore.set(VERTICAL_COOKIE, vertical, { path: "/" });
  return NextResponse.json({ success: true });
}
