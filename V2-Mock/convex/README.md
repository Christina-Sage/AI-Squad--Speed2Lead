# Convex backend

This app persists three things in **Convex** (migrated off Neon/Postgres):

| Table | Replaces (old SQL) | Used by |
| --- | --- | --- |
| `accountOverrides` | `account_overrides` | `lib/salesforce/mock/overrides.ts` — "Assign to Me" / ABM status |
| `auditLog` | `audit_log` | `lib/audit/*` — every rep action; worked-state is derived from it |
| `savedWorklists` | `saved_worklists` | `lib/worklists/saved.ts` — saved campaign lists |

Schema is `convex/schema.ts`; functions are `convex/{overrides,audit,worklists}.ts`.
The Next.js server layer calls them through `lib/convex/server-client.ts`
(`ConvexHttpClient`, reading `NEXT_PUBLIC_CONVEX_URL`). Everything else in the app
still runs on the in-memory mock fixtures — Convex only holds the persisted state.

## First-time setup (do this once)

```bash
npm install
npx convex dev        # prompts a login, creates the project, pushes schema/functions,
                      # writes CONVEX_DEPLOYMENT + NEXT_PUBLIC_CONVEX_URL into .env.local,
                      # and regenerates convex/_generated/ (kept in sync while running)
```

Leave `npx convex dev` running alongside `npm run dev` during local development.

## Vercel (production)

1. Convex dashboard → **Settings → Deploy keys** → create a **production** deploy key.
2. Vercel project → **Settings → Environment Variables** → add
   `CONVEX_DEPLOY_KEY` = that key.
3. Deploy. `scripts/vercel-build.mjs` runs `npx convex deploy --cmd 'next build'`,
   which pushes the Convex functions and builds Next with `NEXT_PUBLIC_CONVEX_URL`
   injected automatically. (No key → the app still builds, but the overrides /
   audit-log / saved-worklist features have no backend until it's set.)

`convex/_generated/` is committed (the app won't type-check without it) and is
regenerated identically by `convex dev` / `convex deploy`.
