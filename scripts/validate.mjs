#!/usr/bin/env node
/* Validates data/periods.json and every period file. Run: node scripts/validate.mjs */
import fs from "node:fs";
import path from "node:path";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const MOM = ["growing", "stable", "emerging", "declining", "steady", "rising", "new", "fading"]; /* last four are aliases the site maps */
const LANGS = ["en", "fr", "nl"];

export function validateReport(r, lang) {
  const e = [], p = s => lang + ": " + s;
  if (!r || typeof r !== "object") return [p("report missing")];
  if (!r.meta || !r.meta.targetBrand) e.push(p("meta.targetBrand missing"));
  const ex = r.executiveSummary || {};
  for (const k of ["overview", "dominantMood", "culturalNuances", "commercialOpportunity"]) if (!ex[k]) e.push(p("executiveSummary." + k + " missing"));
  if (!Array.isArray(r.themes) || !r.themes.length) e.push(p("themes missing or empty"));
  (r.themes || []).forEach((t, i) => {
    const q = s => p("themes[" + i + "] " + s);
    if (!t.themeId) e.push(q("themeId missing"));
    if (!t.themeName) e.push(q("themeName missing"));
    if (!t.shortLabel) e.push(q("shortLabel missing"));
    if (!(t.summary && t.summary.description)) e.push(q("summary.description missing"));
    const m = String((t.momentum && t.momentum.status) || "").toLowerCase();
    if (!MOM.includes(m)) e.push(q("momentum.status '" + m + "' is not one of " + MOM.join("/")));
    if (!Array.isArray(t.dataSources)) e.push(q("dataSources missing"));
  });
  const ap = r.actionPlan || {};
  if (!ap.optimalTiming) e.push(p("actionPlan.optimalTiming missing"));
  if (!Array.isArray(ap.keyContentPillars)) e.push(p("actionPlan.keyContentPillars missing"));
  if (!ap.regionalStrategy) e.push(p("actionPlan.regionalStrategy missing"));
  if (!Array.isArray(r.headlineStats) || !r.headlineStats.length) e.push(p("headlineStats missing"));
  return e;
}

export function validatePeriod(pd) {
  const e = [];
  if (!DATE.test(pd.start || "")) e.push("start is not YYYY-MM-DD");
  if (!DATE.test(pd.end || "")) e.push("end is not YYYY-MM-DD");
  if (pd.start && pd.end && pd.start > pd.end) e.push("start is after end");
  if (pd.id !== pd.end) e.push("id must equal end date");
  if (pd.netSentiment != null && (typeof pd.netSentiment !== "number" || Math.abs(pd.netSentiment) > 100)) e.push("netSentiment must be a number between -100 and 100, or null");
  for (const l of LANGS) e.push(...validateReport(pd.reports && pd.reports[l], l));
  if (pd.reports && pd.reports.en) {
    const ids = l => (pd.reports[l] && pd.reports[l].themes || []).map(t => t.themeId).join(",");
    for (const l of ["fr", "nl"]) if (ids(l) !== ids("en")) e.push(l + ": theme ids/order differ from English (" + ids(l) + " vs " + ids("en") + ")");
  }
  return e;
}

export function validateIndex(idx, root) {
  const e = [];
  if (!idx || !Array.isArray(idx.periods) || !idx.periods.length) return ["periods.json has no periods"];
  const seen = new Set();
  idx.periods.forEach((p, i) => {
    if (seen.has(p.id)) e.push("duplicate period id " + p.id);
    seen.add(p.id);
    if (!p.file || !fs.existsSync(path.join(root, p.file))) e.push("period " + p.id + ": file not found (" + p.file + ")");
    const prev = idx.periods[i - 1];
    if (prev && !p.kind && !prev.kind && prev.end < p.end) e.push("periods.json is not sorted newest first");
    if (prev && prev.kind === "launch" && !p.kind) e.push("the launch report must come after the weekly periods");
  });
  return e;
}

if (import.meta.url === "file://" + process.argv[1]) {
  const root = path.resolve(path.dirname(process.argv[1]), "..");
  const idx = JSON.parse(fs.readFileSync(path.join(root, "data", "periods.json"), "utf8"));
  const errs = validateIndex(idx, root);
  for (const p of idx.periods) {
    try {
      const pd = JSON.parse(fs.readFileSync(path.join(root, p.file), "utf8"));
      errs.push(...validatePeriod(pd).map(x => p.id + ": " + x));
    } catch (err) { errs.push(p.id + ": " + err.message); }
  }
  if (errs.length) { console.error("INVALID:\n  - " + errs.join("\n  - ")); process.exit(1); }
  console.log("VALID: " + idx.periods.length + " periods.");
}
