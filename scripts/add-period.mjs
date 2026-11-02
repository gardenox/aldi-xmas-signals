#!/usr/bin/env node
/*
  Adds one 4-week period to the site.

  node scripts/add-period.mjs --raw email.txt --extras extras.json --fr fr.json --nl nl.json [--replace]

  --raw     The LLM's output as received (any text before the first "{" is ignored).
  --extras  { "start":"YYYY-MM-DD", "end":"YYYY-MM-DD", "netSentiment": 53,
              "headlineStats":[{"value":"…","label":"…"}, …],      (English, 2–4 items)
              "shortLabels":{"theme_1":"Advent\ncalendars", …} }   (English, one per theme)
  --fr/--nl Full translated reports (same shape as the English one, including
            headlineStats and a shortLabel on every theme).
  --replace Overwrite a period that already exists.

  Writes data/periods/<end>.json, updates data/periods.json, then validates everything.
*/
import fs from "node:fs";
import path from "node:path";
import { validatePeriod, validateIndex } from "./validate.mjs";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, all) => {
  if (v.startsWith("--")) a.push([v.slice(2), all[i + 1] && !all[i + 1].startsWith("--") ? all[i + 1] : true]);
  return a;
}, []));
const die = m => { console.error("ERROR: " + m); process.exit(1); };
for (const k of ["raw", "extras", "fr", "nl"]) if (!args[k]) die("missing --" + k);

const readJson = (f, label) => {
  let t = fs.readFileSync(f, "utf8");
  const i = t.indexOf("{"), j = t.lastIndexOf("}");
  if (i < 0 || j < i) die(label + ": no JSON object found");
  t = t.slice(i, j + 1);
  try { return JSON.parse(t); } catch (e) { die(label + ": invalid JSON (" + e.message + ")"); }
};

const en = readJson(args.raw, "raw");
const extras = readJson(args.extras, "extras");
const fr = readJson(args.fr, "fr");
const nl = readJson(args.nl, "nl");

en.headlineStats = extras.headlineStats || [];
for (const t of en.themes || []) {
  const s = extras.shortLabels && extras.shortLabels[t.themeId];
  if (s) t.shortLabel = s;
}

const period = {
  id: extras.end,
  start: extras.start,
  end: extras.end,
  analysisDate: (en.meta && en.meta.analysisDate) || extras.end,
  netSentiment: typeof extras.netSentiment === "number" ? extras.netSentiment : null,
  addedAt: new Date().toISOString(),
  reports: { en, fr, nl }
};

const errs = validatePeriod(period);
if (errs.length) die("period failed validation:\n  - " + errs.join("\n  - "));

const idxFile = path.join(root, "data", "periods.json");
const idx = fs.existsSync(idxFile) ? JSON.parse(fs.readFileSync(idxFile, "utf8")) : { periods: [] };
const exists = idx.periods.some(p => p.id === period.id);
if (exists && !args.replace) die("period " + period.id + " already exists (use --replace to overwrite)");

fs.writeFileSync(path.join(root, "data", "periods", period.id + ".json"), JSON.stringify(period, null, 1) + "\n");
idx.periods = idx.periods.filter(p => p.id !== period.id);
idx.periods.push({ id: period.id, start: period.start, end: period.end, file: "data/periods/" + period.id + ".json" });
idx.periods.sort((a, b) => (a.kind === "launch") - (b.kind === "launch") || b.end.localeCompare(a.end));
idx.updated = new Date().toISOString();

const idxErrs = validateIndex(idx, root);
if (idxErrs.length) die("index failed validation:\n  - " + idxErrs.join("\n  - "));
fs.writeFileSync(idxFile, JSON.stringify(idx, null, 1) + "\n");
console.log("OK: added period " + period.id + " (" + period.start + " to " + period.end + "), " + en.themes.length + " themes. " + idx.periods.length + " periods in total.");
