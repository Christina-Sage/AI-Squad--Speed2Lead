# Convex setup — view, edit, export the source tables

How to stand up Convex so the app reads/writes the ten real source tables, and
how the team can view, hand-edit, export, and re-import the data. Companion to
`DEDUPE-PRODUCT-AWARE.md` (the model) and `../lib/salesforce/source-tables.ts`
(the decompose/reassemble mapping).

The default `mock` provider keeps everything in memory and never touches Convex.
Everything below is the opt-in `convex` path.

---

## 1. Stand up a Convex project (one-time, needs a Convex login)

```bash
cd V2-Mock
npx convex dev
```

This links (or creates) a Convex project, provisions a **dev deployment**, writes
`NEXT_PUBLIC_CONVEX_URL` into `.env.local`, pushes the ten-table schema +
functions, and regenerates `convex/_generated/` (overwriting the committed
hand-edited `api.d.ts` — expected). Leave it running while you develop.

> This is the missing piece — the schema/provider/seed are all in the repo, but
> no Convex project is linked yet. It can't be scripted headlessly; it needs an
> interactive Convex login.

## 2. Point the app at Convex

In `.env.local`:

```
SALESFORCE_PROVIDER=convex
ALLOW_DEV_SEED=1
```

Without `SALESFORCE_PROVIDER=convex` the app stays on the in-memory mock and
never reads the tables.

## 3. Seed the tables

```bash
pnpm dev            # terminal 2
pnpm seed:convex    # terminal 3 — decomposes the fixtures into all 10 tables
```

`convex dev`/`deploy` pushes **schema + functions, not rows** — the tables come
up **empty** until seeded. `seed:convex` is idempotent (each table's `replaceAll`
wipes and reloads), so re-running it resets to the fixtures.

---

## View · edit · export · import (the "mess with the tables" workflow)

Once Convex is linked, use the **Convex dashboard** (`npx convex dashboard`) →
**Data**:

- **View** every table (`gmoAccounts`, `intacctAccounts`, `fusionAccounts`, …).
- **Edit / add / delete** rows by hand — the provider reads them live on the next
  request, so a hand-edit shows up in the worklist immediately.

CLI export/import — the spreadsheet round-trip:

```bash
npx convex export --path ./convex-export        # dump every table to files
# …edit in a spreadsheet / script, then:
npx convex import --table gmoAccounts data.jsonl --replace
```

To inspect the table-formatted data **without** Convex, use
`pnpm dump:source-tables` (see `docs/source-tables/`).

### Adding an account so it shows in the worklist

The worklist is `listAccounts()` over `gmoAccounts` — so a new account appears
once its `gmoAccounts` row exists (dashboard add, or `convex import`). To give it
customer ownership (which drives the de-dupe verdict), add a matching row to:

- **`intacctAccounts`** — for Sage Intacct / Sage Intacct Construction customers, or
- **`fusionAccounts`** — for every other product (X3, BMS, S50, SSG, the other CRE products),

with a `products: [{ product, status }]` entry. The system is implied by the
table; the provider merges these into the account's `customerProducts`.

> **Note:** the app's "Import list" button *filters* the worklist to accounts
> that already exist — it does not create accounts. Creating accounts is done at
> the table level (above). A UI "import creates accounts from a spreadsheet" flow
> is planned as a separate change.

---

## Production (Vercel)

- Set `CONVEX_DEPLOY_KEY` (Convex dashboard → Settings → Deploy Keys) in the
  Vercel project — `scripts/vercel-build.mjs` then runs `convex deploy` on every
  build (pushes schema + functions, injects `NEXT_PUBLIC_CONVEX_URL`).
- Set `SALESFORCE_PROVIDER=convex`, and `ALLOW_DEV_SEED=1` **temporarily** for the
  one-time seed.
- After the first deploy: `curl -X POST https://<app>.vercel.app/api/dev/seed`,
  then remove `ALLOW_DEV_SEED` and redeploy so the seed route can't be hit again.
- **Preview builds with a production deploy key push schema to prod Convex
  regardless of branch** — consider a separate dev/preview Convex deployment +
  preview deploy key.
