import { execSync } from "node:child_process";

// Vercel runs this in place of the default build (Next.js picks up a
// `vercel-build` script automatically).
//
// Convex + Vercel sync: when `CONVEX_DEPLOY_KEY` is set (a Vercel project env
// var, generated in the Convex dashboard → Settings → Deploy Keys), we run
// `convex deploy`. That pushes the Convex schema + functions to the deployment
// the key targets, then runs the Next build with `NEXT_PUBLIC_CONVEX_URL`
// injected so the build points at the just-deployed backend.
//
// The Convex deploy is NON-FATAL by omission: without the key we log and fall
// back to a plain build, so a not-yet-configured env can never turn a working
// deployment into a failing one. Add the key in Vercel to enable the sync.
const run = (cmd) => execSync(cmd, { stdio: "inherit" });

if (process.env.CONVEX_DEPLOY_KEY) {
  console.log("[vercel-build] CONVEX_DEPLOY_KEY present — deploying Convex, then building");
  run("npx convex deploy --cmd 'pnpm build'");
} else {
  console.warn(
    "[vercel-build] no CONVEX_DEPLOY_KEY — skipping Convex deploy, building only. " +
      "Set CONVEX_DEPLOY_KEY in the Vercel project (from the Convex dashboard → " +
      "Deploy Keys) to sync the Convex backend on every deploy.",
  );
  run("pnpm build");
}
