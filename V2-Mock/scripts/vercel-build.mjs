import { execSync } from "node:child_process";

// Vercel runs this in place of the default build (Next.js picks up a
// `vercel-build` script automatically).
//
// Convex is a separate service: schema and functions are pushed to the Convex
// deployment with `npx convex deploy` (run from CI or locally), not by this
// build. The Next.js app only needs `NEXT_PUBLIC_CONVEX_URL` pointing at that
// deployment. There is nothing DB-related to do here anymore — the former
// Drizzle/Neon migration step has been removed.
const run = (cmd) => execSync(cmd, { stdio: "inherit" });

run("pnpm build");
