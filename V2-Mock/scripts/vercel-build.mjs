import { execSync } from "node:child_process";

// Vercel runs this in place of the default build (Next.js picks up a
// `vercel-build` script automatically).
//
// The datastore is Convex (migrated off Neon/Postgres). When CONVEX_DEPLOY_KEY
// is set in the Vercel project env, `convex deploy` pushes the Convex schema +
// functions and runs the Next build with NEXT_PUBLIC_CONVEX_URL injected — the
// canonical Convex↔Vercel integration. Without the key we still build, so the
// static/mock parts of the app deploy; Convex-backed features (overrides, audit
// log, saved worklists) need the key/URL to work at runtime.
const run = (cmd) => execSync(cmd, { stdio: "inherit" });

if (process.env.CONVEX_DEPLOY_KEY) {
  console.log("[vercel-build] CONVEX_DEPLOY_KEY present — deploying Convex, then building");
  run("npx convex deploy --cmd 'next build'");
} else {
  console.log(
    "[vercel-build] no CONVEX_DEPLOY_KEY — building without a Convex deploy. " +
      "Set CONVEX_DEPLOY_KEY in the Vercel project env to enable overrides, the " +
      "audit log, and saved worklists.",
  );
  run("next build");
}
