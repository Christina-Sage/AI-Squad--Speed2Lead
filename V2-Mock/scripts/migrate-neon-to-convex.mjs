// One-command Neon -> Convex data migration.
//
// Runs the Neon export, then imports every produced file into the PRODUCTION
// Convex deployment (the one the Vercel app uses). Append mode — it never
// deletes existing rows.
//
// Prerequisites (both live on YOUR machine, which is why this can't run in a
// sandbox): the Neon DATABASE_URL in .env.local, and a logged-in Convex CLI
// (`npx convex dev` earlier, or `npx convex login`).
//
// Usage:
//   pnpm migrate:neon
//
// To preview without importing, run the export alone: `pnpm export:neon`.

import { execSync } from "node:child_process";
import { existsSync, statSync } from "node:fs";

const run = (cmd) => execSync(cmd, { stdio: "inherit" });

const TABLES = ["auditLog", "savedWorklists", "accountOverrides", "capturedLeads"];

console.log("== 1/2  Exporting from Neon ==");
run("node scripts/export-neon-to-convex.mjs");

console.log("\n== 2/2  Importing into Convex (production, --append) ==");
for (const table of TABLES) {
  const file = `convex-import/${table}.jsonl`;
  if (!existsSync(file) || statSync(file).size === 0) {
    console.log(`  ${table}: no rows to import — skipping`);
    continue;
  }
  run(`npx convex import --prod --table ${table} ${file} --append -y`);
}

console.log(
  "\nDone. Verify row counts in the Convex dashboard (Production deployment → Data)" +
    " against the export counts printed above, then reload the deployed app.",
);
