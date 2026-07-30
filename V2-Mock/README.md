# WorkIt — V2 Mock (AI Squad Prototype UI)

V2 keeps all V1 functionality (mock Salesforce provider, workability engine, ProPublica/website research, audit log, demo user / team / product switchers) and recreates the AI Squad prototype UI (`dedupe-engine-prototype.html`) on top of it.

## What's new vs V1

- **Six-check "Can I work it?" verdict** — Customer Status, TAM, ROE, Open Opportunity, plus two new checks: Disqualified Opportunity (6-month cooling-off after a DQ'd opp that reached Discovery) and Partner Relationship (active VAR deal registration blocks). Animated compact checklist with verdict banner.
- **"Should I work it?" scoring** — Fit (40%) + Intent (35%) + Workability (25%). Fit/intent signals are fixture-driven (external systems aren't mocked); workability is computed live from the bundle. Powers the ranked **Today's Worklist** and **Blocked by de-dupe** lists on the home page.
- **Work-it page interactions** — found ICP contacts with "+ Add to Salesforce" (`POST /api/contacts`), data-hygiene field suggestions with "Apply to SFDC" (`POST /api/hygiene`), and "Push to Outreach" sequence push with attached signals (`POST /api/outreach`). All three write audit-log entries.
- **Sage light/dark theme** with toggle (light "white stage" default, Brilliant Green dark mode), toast notifications, business-case footer.

## Getting started

```bash
pnpm install
npx convex dev   # first run links the Convex project + generates convex/_generated
pnpm dev         # second terminal
```

Persistence (audit log, saved worklists, owner overrides) lives in **Convex**.
Requires `.env.local` with `NEXT_PUBLIC_CONVEX_URL`, which `npx convex dev`
writes automatically. See [docs/BACKEND.md](docs/BACKEND.md) for the schema and
the Neon→Convex migration runbook.

```bash
pnpm test   # vitest
pnpm build  # production build (needs NEXT_PUBLIC_CONVEX_URL)
```
