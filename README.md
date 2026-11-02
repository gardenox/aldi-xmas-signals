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
