import { execSync } from "node:child_process";

// Vercel runs this in place of the default build (Next.js picks up a
// `vercel-build` script automatically). Drizzle migrations are not applied by
// Vercel on their own, so a schema change (e.g. the captured_leads table) would
// be missing at runtime.
//
// Migration is best-effort and NON-FATAL: if it fails (or there's no
// DATABASE_URL), we log and still build, so this can never turn a working
// deployment into a failing one. If migrations can't be applied here, apply
// them once against the deploy database with `pnpm db:migrate`.
const run = (cmd) => execSync(cmd, { stdio: "inherit" });

if (process.env.DATABASE_URL) {
  try {
    console.log("[vercel-build] DATABASE_URL present — applying migrations");
    run("pnpm db:migrate");
  } catch (err) {
    console.warn(
      "[vercel-build] migrations did not apply — continuing with build. " +
        "Run `pnpm db:migrate` against the deploy database to enable the lead " +
        "worklist and form. Reason:",
      err?.message ?? err,
    );
  }
} else {
  console.log("[vercel-build] no DATABASE_URL — skipping migrations");
}

run("pnpm build");
