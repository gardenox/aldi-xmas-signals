# Weekly update: add the new 4-week period

These are the instructions the weekly scheduled task follows. They can also be run by hand.

## 1. Find the email
- Inbox: the connected Gmail (ben.farrell@pulsarplatform.com).
- Search: `from:noreply@pulsarplatform.com subject:"Early Christmas Signals" newer_than:3d`. Take the newest match. The subject carries the window, e.g. "Early Christmas Signals Analysis — Belgium (Last 4 Weeks, 5 Oct – 1 Nov 2026)".
- Read it with get_thread in PLAIN_TEXT format and save `plaintextBody` exactly as returned to `email.txt` (scratch folder). Do not retype or tidy it.
- Run `node scripts/extract-json.mjs email.txt raw.json`. The email arrives HTML-escaped with underscores turned into `<em>` tags; the script undoes this and checks the theme ids. If it fails, try the message's html body the same way before giving up.
- If no email is found, stop and send the "nothing new" note (step 6).

## 2. Decide whether it is new
- Work out the period end date (`end`, YYYY-MM-DD) from `meta.timeframe`. If the timeframe is missing, use the day before `meta.analysisDate`. `start` = end minus 27 days, unless the timeframe gives the start.
- If `data/periods/<end>.json` already exists, stop. This run has already been added.

## 3. Prepare the files (in a scratch folder, not in the repo)
- `raw.json`: from step 1. Do not edit the English.
- `extras.json`:
  - `start`, `end`
  - `netSentiment`: only if the JSON gives positive and negative counts: round((pos − neg) / (pos + neg) × 100). Otherwise `null`. Never estimate.
  - `headlineStats`: 2–4 `{ "value", "label" }` items. Use only numbers stated in the JSON (volume, growth, peak, sentiment, language split). Short value ("+60%", "~2,000"), label under 50 characters.
  - `shortLabels`: one per themeId, 1–3 words on up to two lines (use `\n`), about 12 characters per line. Used on the theme map.
- `fr.json` (French for Belgium, fr-BE) and `nl.json` (Flemish Dutch, nl-BE): full translations of the English report, plus `headlineStats` and a `shortLabel` on every theme.
  - Same structure, same themeIds in the same order.
  - Translate: all prose, themeName, timeframe, pillar names (use the glossary below).
  - Keep unchanged: hashtags, @handles, quoted post text, brand names, platform and channel names (Instagram Reels, Facebook, TikTok, Pinterest…), `momentum.status`, `dataSources`, `isCrossPlatform`, numbers.
  - Local number style: FR "2 000", "+60 %" (narrow no-break space before %); NL "2.000", "+60%".
  - Sinterklaas (Flanders) / Saint-Nicolas (Wallonia): keep both names as the English does.
  - Tone: plain, client-ready, no em-dash overuse. Dutch and French should read as native, not word-for-word.

### Pillar glossary (EN → FR / NL)
| English | Français | Nederlands |
|---|---|---|
| Price Leadership | Meilleur prix | Prijsleiderschap |
| Festive Range | Gamme festive | Feestassortiment |
| Quality | Qualité | Kwaliteit |
| Family | Famille | Gezin |
| Value | Rapport qualité-prix | Waarde |
| Gifting | Cadeaux | Cadeaus |
| Brand Warmth | Chaleur de marque | Merkwarmte |
| Planning Help | Aide à la préparation | Hulp bij plannen |
| Inclusivity | Inclusivité | Inclusiviteit |
| Cultural Relevance | Pertinence culturelle | Culturele relevantie |

New pillars: translate naturally and add them to this table in the same commit.

## 4. Add and validate
```
node scripts/add-period.mjs --raw raw.json --extras extras.json --fr fr.json --nl nl.json
node scripts/validate.mjs
```
If either fails, fix the prepared files (never the English content) and retry. If it still fails, do not push. Go to step 6 and report the error.

## 5. Publish
- Commit `data/periods/<end>.json` and `data/periods.json` (and WEEKLY_UPDATE.md if the glossary changed) with the message `Add period <start> to <end>`.
- Push to the branch the host deploys from. Netlify or Vercel redeploys automatically; the new period becomes the "Latest" tab.

## 6. Report
Send one short email to ben.farrell@pulsarplatform.com (subject starting "Xmas signals site:"):
- Success: period dates, number of themes, theme names, and anything notable versus the previous period (new or dropped themes, momentum changes, sentiment shift). Include the site link.
- Nothing new / failure: what happened and what is needed.
