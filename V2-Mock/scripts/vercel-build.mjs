import { execSync } from "node:child_process";

// Vercel runs this in place of the default build (Next.js picks up a
// `vercel-build` script automatically). Drizzle migrations are not applied by
// Vercel on their own, so a schema change (e.g. the captured_leads table) would
// be missing at runtime and break the worklist and the lead form.
//
// Guarded on purpose: migrate only when a DATABASE_URL is configured. If it
// isn't, we skip migrations and still build — exactly the previous behavior —
// so this can never turn a working build into a failing one.
const run = (cmd) => execSync(cmd, { stdio: "inherit" });

if (process.env.DATABASE_URL) {
  console.log("[vercel-build] DATABASE_URL present — applying migrations");
  run("pnpm db:migrate");
} else {
  console.log("[vercel-build] no DATABASE_URL — skipping migrations");
}

run("pnpm build");
