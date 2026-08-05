# WorkIt V2 — Deploy & Seed Runbook

The three-system Convex build is in the code. Whether **production actually runs
on Convex** depends on Vercel env vars and a one-time seed — this file is the
checklist for that. Do it in order.

## 0. TL;DR

1. Set the four env vars in Vercel (§1).
2. Deploy. The build runs `convex deploy` (pushes schema + functions).
3. Seed prod **once** (§3) — deploy loads no rows.
4. Lock the seed route back down (§4).
5. Verify with `GET /api/health` (§5).

## 1. Vercel env vars

Vercel → Project → **Settings → Environment Variables** (Production scope).

| Var | Value | Why |
|---|---|---|
| `SALESFORCE_PROVIDER` | `convex` | **The actual switch.** Without it the deployed app silently uses the in-memory mock and never reads Convex. |
| `CONVEX_DEPLOY_KEY` | prod deploy key (Convex dashboard → Settings → Deploy Keys) | Enables `convex deploy` in the Vercel build (`scripts/vercel-build.mjs`). |
| `NEXT_PUBLIC_CONVEX_URL` | prod Convex URL | Needed at **runtime** too — server-side `fetchQuery`/`fetchMutation` read it per request. |
| `ALLOW_DEV_SEED` | `1` — **temporarily**, for the one-time seed only (§3–§4) | Guards `/api/dev/seed`. Remove after seeding. |

## 2. Deploy

Push to the branch Vercel builds (or trigger a redeploy). On each deploy, when
`CONVEX_DEPLOY_KEY` is set, `scripts/vercel-build.mjs` runs
`npx convex deploy --cmd 'pnpm build'`, which:

- pushes the Convex **schema + functions** to the deployment the key targets,
- regenerates `convex/_generated/` fresh (the committed hand-edit is moot in the build),
- injects `NEXT_PUBLIC_CONVEX_URL` into the Next build.

**Deploy pushes schema + functions, not rows.** The tables come up **empty** —
that's what §3 is for.

## 3. Seed production once

With `ALLOW_DEV_SEED=1` set and a deploy live:

```bash
curl -X POST https://<your-app>.vercel.app/api/dev/seed
```

The route is double-guarded: it refuses unless `ALLOW_DEV_SEED=1` **and**
`SALESFORCE_PROVIDER=convex`. It loads all 10 source tables + `sdrLeads`, plus a
few example **Saved Worklists** per demo user (Tradeshow — Money20/20, ABX MV
Dental, BMS Upsell), and is idempotent (source tables `replaceAll`;
example worklists are keyed by business id and replaced in place, leaving any
user-created lists untouched), so re-running it just resets the demo data.

## 4. Lock it back down

Remove `ALLOW_DEV_SEED` from Vercel and redeploy, so the wipe-and-reload route
can't be hit again. (Leaving it at `1` means anyone who finds the URL can reset
your data.)

## 5. Verify

```bash
curl -s https://<your-app>.vercel.app/api/health | jq
```

Read-only, no secrets. Interpret:

| Response | Meaning | Action |
|---|---|---|
| `provider: "mock"` | App is **not** on Convex | Set `SALESFORCE_PROVIDER=convex`, redeploy |
| `provider: "convex"`, `convexUrlConfigured: false` | Misconfigured | Set `NEXT_PUBLIC_CONVEX_URL`, redeploy |
| `provider: "convex"`, `seeded: false` (counts all 0) | Connected but empty | Run §3 |
| `provider: "convex"`, `seeded: true`, counts > 0 | **Connected and seeded — done** | — |

Then eyeball the app: the worklist should render real accounts, and an account
page + a lead page should show de-dupe verdicts.

## 6. Sharp edges — read before deploying

- **Preview deploys hit prod Convex.** With a *production* deploy key,
  `convex deploy` targets the prod deployment **regardless of git branch** — a
  Vercel *preview* build of any branch pushes its schema to prod Convex. It's
  additive (new tables), but it happens. To isolate previews, create a separate
  Convex **dev/preview deployment** and give Vercel's Preview scope its own
  `CONVEX_DEPLOY_KEY` + `NEXT_PUBLIC_CONVEX_URL`.
- **Deploy ≠ data.** Every schema change needs a re-seed; deploy never loads rows.
- **The seed wipes.** `replaceAll` deletes existing rows before loading. Never
  point `ALLOW_DEV_SEED=1` at a deployment holding data you care about.
