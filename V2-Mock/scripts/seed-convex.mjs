// Seeds the mock CRM fixtures into Convex by POSTing to the app's dev seed
// route. The route runs inside Next.js, so the TypeScript fixtures and their
// `@/` path aliases resolve exactly as they do at runtime — no separate TS
// build step for this script.
//
// Prerequisites:
//   1. `npx convex dev` (links the Convex project, writes NEXT_PUBLIC_CONVEX_URL)
//   2. `SALESFORCE_PROVIDER=convex` and `ALLOW_DEV_SEED=1` in .env.local
//   3. `pnpm dev` running in another terminal
//
// Then: `pnpm seed:convex`  (override target with SEED_URL=... if not :3000)

const baseUrl = process.env.SEED_URL ?? "http://localhost:3000";
const url = `${baseUrl.replace(/\/$/, "")}/api/dev/seed`;

try {
  const res = await fetch(url, { method: "POST" });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.success) {
    console.error(`Seed failed (HTTP ${res.status}):`, body.error ?? body);
    process.exit(1);
  }
  console.log("Seeded Convex from fixtures:");
  for (const [table, result] of Object.entries(body.seeded ?? {})) {
    console.log(`  ${table}: ${result?.inserted ?? "?"} rows`);
  }
} catch (err) {
  console.error(`Could not reach ${url}. Is \`pnpm dev\` running?`);
  console.error(String(err));
  process.exit(1);
}
