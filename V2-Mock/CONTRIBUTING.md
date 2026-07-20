# Contributing — Dedupe Engine V2 Mock

A short guide for the AI Squad. Most of us work inside Claude, so the trickiest part is usually **getting Git to push as *you* rather than as Claude's integration** — that's covered first.

## Prerequisites

- Node.js + [pnpm](https://pnpm.io) (`packageManager` is pnpm; don't mix in `npm install`)
- Write access to the repo (ask Christina to add you as a collaborator)
- [GitHub CLI](https://cli.github.com) (`gh`) for authentication

## Local setup

```bash
pnpm install
pnpm dev          # http://localhost:3000
```

Requires `.env.local` with `DATABASE_URL` (audit log + owner overrides) — same setup as V1.

```bash
pnpm test         # vitest
pnpm lint         # eslint
pnpm build        # production build
```

Run `pnpm test`, `pnpm lint`, and `pnpm build` before opening a PR.

## Authentication — pushing from inside Claude

If `git push` fails with **`403 Resource not accessible by integration`**, Git is trying to push as Claude's GitHub *integration* (an app token without write access) instead of as your personal GitHub account. Your user account has write access; the integration does not.

Fix it by making Git authenticate as **you**:

```bash
# 1. Install gh if it isn't already
#    Windows:  winget install --id GitHub.cli --source winget --accept-package-agreements --accept-source-agreements
#    macOS:    brew install gh

# 2. Log in as yourself (open a NEW terminal so gh is on PATH)
gh auth login          # GitHub.com > HTTPS > Yes > Login with a web browser

# 3. Point Git at your gh credential instead of the integration token — this is the key step
gh auth setup-git

# 4. Confirm you're the authenticated user, with 'repo' scope
gh auth status         # should read: Logged in ... as <your-username>, scopes include 'repo'

# 5. Push
git push
```

Notes:
- The `gh auth login` browser step prints a **one-time code in the terminal** (not the browser) — copy it, press Enter, then paste it into the page that opens.
- If a stale credential keeps hijacking the push (Windows), clear it: **Credential Manager → Windows Credentials → delete `git:https://github.com`**, then push again.
- Check your remote points at the real repo, not a fork:
  ```bash
  git remote -v   # origin should be https://github.com/Christina-Sage/AI-Squad--Speed2Lead.git
  ```

Using your own credential (not the integration) also means commits are attributed to **you**, which is what we want.

## Branch & PR workflow

Don't commit straight to `main`. Branch, push, open a PR, get one review.

```bash
git checkout main
git pull
git checkout -b feat/short-description

# ...make changes...

git add .
git commit -m "feat(v2): describe the change"
git push -u origin feat/short-description
gh pr create --base main --fill        # or open the PR from the GitHub UI
```

### Commit messages

Follow the existing [Conventional Commits](https://www.conventionalcommits.org) style used in the history, e.g.:

- `feat(v2): SDR lead worklist, lead workability, inline stacked feed`
- `chore(v2): add vercel.json pinning Next.js framework preset`

Common prefixes: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`.

## Where things live

- `app/` — Next.js App Router pages and API routes (`app/api/*`)
- `components/` — UI (`ui/` primitives, `results/`, `workit/`, `layout/`, `search/`, `home/`)
- `lib/` — domain logic: `workability/` (the six-check engine), `scoring/`, `leads/`, `research/`, `salesforce/mock/` (mock provider + fixtures)
- `db/` — Drizzle schema and migrations
- `docs/BACKEND.md` — backend notes

See [README.md](README.md) for what V2 adds over V1.
