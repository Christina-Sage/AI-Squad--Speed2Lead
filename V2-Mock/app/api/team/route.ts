import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { TEAM_COOKIE, TEAMS } from "@/lib/teams";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const team = typeof body?.team === "string" ? body.team : "";

  if (!TEAMS.some((t) => t.id === team)) {
    return NextResponse.json({ error: "Unknown team" }, { status: 400 });
  }

  const cookieStore = await cookies();
  cookieStore.set(TEAM_COOKIE, team, { path: "/" });
  return NextResponse.json({ success: true });
}
