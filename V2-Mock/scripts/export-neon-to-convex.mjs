// One-time data migration: export every row from the (Neon) Postgres database
// and write Convex-ready JSONL files under ./convex-import/.
//
// This is DEV-ONLY tooling. It uses `postgres` + `dotenv`, which are kept as
// devDependencies solely for this script; both can be removed once the
// migration is confirmed.
//
// Usage:
//   1. Ensure .env.local has DATABASE_URL (the Neon connection string).
//   2. pnpm export:neon
//   3. Import each file into Convex (see the commands printed at the end):
//        npx convex import --table auditLog        convex-import/auditLog.jsonl        --append
//        npx convex import --table savedWorklists  convex-import/savedWorklists.jsonl  --append
//        npx convex import --table accountOverrides convex-import/accountOverrides.jsonl --append
//        npx convex import --table capturedLeads   convex-import/capturedLeads.jsonl   --append
//
// Transformations applied (to match convex/schema.ts):
//   - Postgres timestamps -> epoch-ms numbers.
//   - snake_case columns  -> camelCase fields.
//   - The audit_log serial `id` is dropped (Convex assigns `_id`).
//   - jsonb columns are emitted as native JSON values.
//   - NULLs are preserved (the schema models nullable columns as `T | null`).

import { mkdir, writeFile } from "node:fs/promises";
import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Add it to .env.local and retry.");
  process.exit(1);
}

const sql = postgres(url, { max: 1 });

const ms = (d) => (d == null ? null : new Date(d).getTime());
const jsonl = (rows) => rows.map((r) => JSON.stringify(r)).join("\n") + (rows.length ? "\n" : "");

// Read a table if it exists, mapping each row; skip (return []) if the table is
// absent. Production only ever had the migrations that were actually applied —
// the later tables (saved_worklists, captured_leads) may never have been
// created — so a missing table is expected and must not abort the migration.
async function readTable(pgName, mapFn) {
  const [{ reg }] = await sql`SELECT to_regclass(${"public." + pgName}) AS reg`;
  if (reg === null) {
    console.warn(`  ${pgName}: table not found in this database — skipping`);
    return [];
  }
  const rows = await sql`SELECT * FROM ${sql(pgName)}`;
  return rows.map(mapFn);
}

async function main() {
  await mkdir("convex-import", { recursive: true });

  // audit_log — drop the serial `id`; nothing referenced it.
  const auditLog = await readTable("audit_log", (r) => ({
    createdAt: ms(r.created_at),
    userId: r.user_id,
    userName: r.user_name,
    team: r.team,
    searchInput: r.search_input,
    searchType: r.search_type,
    accountId: r.account_id ?? null,
    domain: r.domain ?? null,
    accountName: r.account_name ?? null,
    finalStatus: r.final_status ?? null,
    reason: r.reason ?? null,
    reasonCodes: r.reason_codes ?? null,
    action: r.action,
    assignmentDetails: r.assignment_details ?? null,
  }));

  const savedWorklists = await readTable("saved_worklists", (r) => ({
    id: r.id,
    createdAt: ms(r.created_at),
    userId: r.user_id,
    name: r.name,
    source: r.source ?? null,
    accountIds: r.account_ids ?? [],
    expiresAt: ms(r.expires_at),
    archivedAt: ms(r.archived_at),
  }));

  const accountOverrides = await readTable("account_overrides", (r) => ({
    accountId: r.account_id,
    ownerId: r.owner_id,
    ownerName: r.owner_name,
    abmNurtureStatus: r.abm_nurture_status ?? null,
    updatedAt: ms(r.updated_at),
  }));

  // captured_leads is unused by the app but migrated so no data is lost.
  const capturedLeads = await readTable("captured_leads", (r) => ({
    id: r.id,
    createdAt: ms(r.created_at),
    name: r.name,
    title: r.title,
    company: r.company ?? null,
    email: r.email ?? null,
    source: r.source ?? null,
    ownerName: r.owner_name,
    status: r.status,
    priorityGroup: r.priority_group,
    product: r.product,
    fit: r.fit,
    intent: r.intent,
    workability: r.workability,
    score: r.score,
  }));

  const tables = { auditLog, savedWorklists, accountOverrides, capturedLeads };

  for (const [name, rows] of Object.entries(tables)) {
    await writeFile(`convex-import/${name}.jsonl`, jsonl(rows));
    console.log(`  ${name}: ${rows.length} rows -> convex-import/${name}.jsonl`);
  }

  console.log("\nNow import into Convex (order does not matter):");
  for (const name of Object.keys(tables)) {
    console.log(`  npx convex import --table ${name} convex-import/${name}.jsonl --append`);
  }
}

main()
  .then(() => sql.end())
  .catch(async (err) => {
    console.error("Export failed:", err);
    await sql.end();
    process.exit(1);
  });
