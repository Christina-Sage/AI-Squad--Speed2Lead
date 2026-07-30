// One-command Neon -> Convex data migration.
//
// Runs the Neon export, then imports every produced file into the production
// Convex deployment (the one the Vercel app uses).
//
// Auth / target (auto-detected):
//   - CONVEX_DEPLOY_KEY set (CI / GitHub Actions): the key authenticates
//     non-interactively and already scopes the deployment, so `--prod` is
//     omitted.
//   - Otherwise (local, interactive `npx convex login`): `--prod` targets the
//     project's production deployment.
//
// Import mode (CONVEX_IMPORT_MODE):
//   - "replace" (recommended for CI): each run replaces the table with the
//     current Neon snapshot — idempotent, safe to re-run, and Neon is never
//     touched, so nothing is lost.
//   - default "append": adds rows without deleting; re-running double-loads.
//
// DATABASE_URL comes from .env.local (local) or the process env (CI); the
// export script reads whichever is present.
//
// Usage:  pnpm migrate:neon        (preview export only: pnpm export:neon)

import { execSync } from "node:child_process";
import { existsSync, statSync } from "node:fs";

const run = (cmd) => execSync(cmd, { stdio: "inherit" });

const TABLES = ["auditLog", "savedWorklists", "accountOverrides", "capturedLeads"];

const target = process.env.CONVEX_DEPLOY_KEY ? "" : "--prod ";
const mode = process.env.CONVEX_IMPORT_MODE === "replace" ? "--replace" : "--append";

console.log("== 1/2  Exporting from Neon ==");
run("node scripts/export-neon-to-convex.mjs");

console.log(`\n== 2/2  Importing into Convex (production, ${mode}) ==`);
for (const table of TABLES) {
  const file = `convex-import/${table}.jsonl`;
  if (!existsSync(file) || statSync(file).size === 0) {
    console.log(`  ${table}: no rows to import — skipping`);
    continue;
  }
  run(`npx convex import ${target}--table ${table} ${file} ${mode} -y`);
}

console.log(
  "\nDone. Verify row counts in the Convex dashboard (Production deployment → Data)" +
    " against the export counts printed above, then reload the deployed app.",
);
