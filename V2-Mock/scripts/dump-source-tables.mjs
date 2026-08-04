// Writes the ten source tables (dummy fixtures, decomposed) to
// docs/source-tables/<table>.json so the team can export / diff / inspect the
// exact table-formatted data — the same rows the Convex seed loads.
//
// No Convex needed: this reads the in-memory fixtures via the dev route, so the
// default mock provider is fine. Just have the dev server running:
//   1. `pnpm dev`
//   2. `pnpm dump:source-tables`  (override target with DUMP_URL=... if not :3000)

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const baseUrl = process.env.DUMP_URL ?? "http://localhost:3000";
const url = `${baseUrl.replace(/\/$/, "")}/api/dev/source-tables`;
const outDir = path.resolve(process.cwd(), "docs/source-tables");

try {
  const res = await fetch(url);
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.tables) {
    console.error(`Dump failed (HTTP ${res.status}):`, body.error ?? body);
    process.exit(1);
  }

  await mkdir(outDir, { recursive: true });
  const written = [];
  for (const [table, rows] of Object.entries(body.tables)) {
    const file = path.join(outDir, `${table}.json`);
    await writeFile(file, JSON.stringify(rows, null, 2) + "\n");
    written.push([table, rows.length]);
  }
  // A counts index so the folder is scannable at a glance.
  await writeFile(
    path.join(outDir, "_counts.json"),
    JSON.stringify(body.counts, null, 2) + "\n",
  );

  console.log(`Wrote ${written.length} source tables to docs/source-tables/:`);
  for (const [table, count] of written) console.log(`  ${table}: ${count} rows`);
} catch (err) {
  console.error(`Could not reach ${url}. Is \`pnpm dev\` running?`);
  console.error(String(err));
  process.exit(1);
}
