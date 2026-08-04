import { NextResponse } from "next/server";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";

// Read-only deployment diagnostics. Answers the one question the repo can't:
// is the *deployed* app actually reading Convex, and is Convex seeded?
//
// Safe to expose in production: it returns no secrets. NEXT_PUBLIC_CONVEX_URL is
// already a public (build-inlined) value, and the only other outputs are the
// provider name and per-table row counts.
//
//   GET /api/health
//     provider=mock       -> app is on the in-memory mock, NOT Convex
//     provider=convex + counts all >0 -> connected and seeded (the goal)
//     provider=convex + counts all 0  -> connected but empty (run the seed)
export const dynamic = "force-dynamic";

export async function GET() {
  const provider = process.env.SALESFORCE_PROVIDER ?? "mock";
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL ?? null;

  const base = {
    provider,
    usingConvex: provider === "convex",
    convexUrlConfigured: Boolean(convexUrl),
    convexUrl, // NEXT_PUBLIC_* — already public, safe to echo for confirming the deployment
  };

  if (provider !== "convex") {
    return NextResponse.json({
      ok: true,
      ...base,
      note:
        "App is NOT reading Convex — it is on the in-memory mock. " +
        "Set SALESFORCE_PROVIDER=convex in the Vercel project to switch the CRM data source.",
    });
  }

  if (!convexUrl) {
    return NextResponse.json(
      {
        ok: false,
        ...base,
        error:
          "SALESFORCE_PROVIDER=convex but NEXT_PUBLIC_CONVEX_URL is unset. " +
          "The server-side Convex client needs it at runtime.",
      },
      { status: 500 },
    );
  }

  try {
    const counts = await fetchQuery(api.health.counts, {});
    const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
    const seeded = total > 0;
    return NextResponse.json({
      ok: seeded,
      ...base,
      seeded,
      totalRows: total,
      counts,
      note: seeded
        ? "Convex is connected and seeded — the deployed app is running against the database."
        : "Convex is connected but EMPTY. Run the one-time seed: set ALLOW_DEV_SEED=1, " +
          "POST /api/dev/seed, then remove the flag and redeploy.",
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        ...base,
        error: `Convex query failed: ${err instanceof Error ? err.message : String(err)}`,
      },
      { status: 502 },
    );
  }
}
