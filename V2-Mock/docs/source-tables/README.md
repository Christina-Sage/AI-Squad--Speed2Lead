# Source-table dumps

`pnpm dump:source-tables` writes the ten source tables here as JSON —
`gmoAccounts.json`, `intacctAccounts.json`, `fusionAccounts.json`, … plus
`_counts.json` — so you can export, diff, and eyeball the exact table-formatted
data **without** standing up Convex. These are the same rows the Convex seed
(`/api/dev/seed`) loads.

```bash
pnpm dev                 # terminal 1 (default mock provider — no Convex needed)
pnpm dump:source-tables  # terminal 2 — writes docs/source-tables/*.json
```

The `*.json` files are **git-ignored**: the fixtures use relative dates
(`daysAgo(n)`), so every regeneration changes timestamps and would churn the
diff. Regenerate locally whenever you want to inspect the current data.

To mark an account as a **customer of a product**, the ownership lives on the
`intacctAccounts` / `fusionAccounts` row's `products` array (the system is
implied by the table) — not on `gmoAccounts`. The provider reassembles those
into the account's `customerProducts` on read. See `../DEDUPE-PRODUCT-AWARE.md`
and `../../lib/salesforce/source-tables.ts`.
