# Giorgio's Job Hunt

A free, static dashboard for a job search that two AI agents (Grok and Muse) run on my behalf. The agents log every application to a Notion database; this site reads that database on a schedule and publishes:

- a **public dashboard** with aggregate numbers only (counts, streaks, weekly chart, heatmap, breakdowns by role family / region / channel, funnel), and
- a **private detail view** (`/#/private`) with companies, roles, and links, encrypted at build time and decrypted in the browser with a passphrase.

No server, no database of its own, nothing to pay for. Hosted on GitHub Pages and rebuilt by GitHub Actions.

## How data flows

```
Grok / Muse  --append row-->  Notion "Apply log" database
                                      |
                       GitHub Action (cron 4x/day + manual)
                       node scripts/sync.mjs
                        |-> public/data/public.json   aggregates only
                        '-> public/data/private.enc   AES-256-GCM, PBKDF2 key from PRIVATE_PASSPHRASE
                                      |
                              vite build -> GitHub Pages
```

`Fields / answers` (standing answers, demographics, salary) is never exported. ATS confirmation URLs are stripped; only canonical posting links survive.

## One-time setup

1. **Create the repo.** Push this folder to a new GitHub repository (e.g. `job-hunt`). In Settings > Pages, set Source to **GitHub Actions**.
2. **Notion integration.** Go to <https://www.notion.so/my-integrations>, create an internal integration (read content is enough), copy the token. Then open the `Agent Bridge · Grok ↔ Muse` page in Notion, click `...` > Connections, and add the integration so it can read the Apply log.
3. **Repository secrets** (Settings > Secrets and variables > Actions > Secrets):
   - `NOTION_TOKEN` - the integration token
   - `PRIVATE_PASSPHRASE` - whatever you want to hand to people who may see the detail view
4. **Repository variables** (same page, Variables tab), optional:
   - `NOTION_DATA_SOURCE_ID` - defaults to the Apply log data source id already in the workflow
   - `VITE_BASE` - defaults to `/<repo-name>/`. Set to `/` if you attach a custom domain or use a `<user>.github.io` repo.
5. Run the workflow once from the Actions tab (**Sync from Notion and deploy** > Run workflow). The site appears at `https://<user>.github.io/<repo>/`.

## Local development

```bash
npm install
npm run sync:sample   # writes public/data from scripts/sample-rows.json, passphrase "demo"
npm run dev           # http://localhost:5173/job-hunt/
```

To run against real Notion data locally, copy `.env.example` to `.env`, fill it in, and run `npm run sync` with the variables exported (`set -a; source .env; set +a; npm run sync`).

## Sharing the private view

Give someone the URL `https://<user>.github.io/<repo>/#/private` plus the passphrase. The passphrase is remembered for the browser tab only. To revoke access, change the `PRIVATE_PASSPHRASE` secret and re-run the workflow; the old passphrase stops working on the next deploy.

## Notion schema this expects

Database: `Apply log` (data source `2909dfcb-954c-482f-ad12-b1bc752572ea`)

| Property | Type | Used for |
| --- | --- | --- |
| Name | title | `Company - Role` |
| Date | date | all time series (interpreted as ET) |
| Company, Role, Location | text | private view; role family and region are keyword-derived in `scripts/classify.mjs` |
| Source | select: LinkedIn / Company careers / Greenhouse / Workday / Other ATS / Job board / Other | channel breakdown (legacy Jobs→Company careers, Muse→Other at sync) |
| Applied by | select: Grok / Muse | private view badge |
| URL | url | private view link (query strings stripped) |
| Result | select: Submitted / Blocked / Incomplete / Skipped | headline counts use Submitted; Blocked + Incomplete = "in progress"; Skipped hidden |
| Outcome | select: Applied / Rejected / Interview / Offer | funnel, set by hand |
| Fields / answers | text | never exported |

## Adjusting the schedule

The cron in `.github/workflows/sync.yml` is in UTC. `30 12,14,20,22 * * *` is 8:30 / 10:30 / 16:30 / 18:30 Eastern Daylight Time. When clocks change to EST, use `30 13,15,21,23 * * *`.
