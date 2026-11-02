# ALDI Belgium: Early Christmas Signals

Static site. No build step: `index.html` loads `data/periods.json`, then the selected period from `data/periods/<end-date>.json`.

```
index.html               the site (design, interface text in EN/FR/NL, rendering)
data/periods.json        list of periods, newest weekly run first, launch report last
data/periods/*.json      one file per 4-week period: { id, start, end, analysisDate, netSentiment, reports: { en, fr, nl } }
scripts/add-period.mjs   merges a new LLM run + translations into a period file and updates the index
scripts/validate.mjs     checks every period file (also runs as the Netlify/Vercel build command)
WEEKLY_UPDATE.md         the steps the weekly scheduled task follows
```

## Hosting
Connect this repo to Netlify or Vercel. No framework, publish directory is the repo root. Every push redeploys.
Period data is served with `Cache-Control: no-cache`, so clients see a new period as soon as it is deployed.

## Preview locally
`fetch` does not work from `file://`. Run `python3 -m http.server` in this folder and open http://localhost:8000.

## Linking to a period
`…/#2026-10-14` opens that period directly.

## What each run should contain
Required (the site validates these): `meta.targetBrand`, `executiveSummary` (overview, dominantMood, culturalNuances, commercialOpportunity), `themes[]` (themeId, themeName, momentum.status, summary.description, dataSources), `actionPlan` (optimalTiming, keyContentPillars, regionalStrategy).

Optional, shown when present: `platformCoverage[]` (the "Where the conversation is" panel and per-platform counts), `themes[].exampleContent[]` (example posts), `themes[].dataConfidence` / `confidenceNote` / `platformFocus`.

## Password
The page shows a password screen before it loads any report data. It is set in `index.html` as `CONFIG.passwordHash`: a SHA-256 of `ecs-site:v1:` + the password, so the password itself is not written in the page.

- Change the password: run `printf '%s' "ecs-site:v1:NEW-PASSWORD" | sha256sum`, paste the result into `passwordHash`, commit and push. Everyone has to enter the new password.
- Once entered correctly, the browser remembers it (localStorage) until the password changes.
- Remove the screen: set `passwordHash` to `""`.
- This keeps casual visitors out. It is not strong protection: the data files under `/data/` can still be opened directly by anyone who knows or guesses their address. Keep the GitHub repo private.
