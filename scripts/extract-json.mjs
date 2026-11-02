#!/usr/bin/env node
/*
  Pulls the LLM's JSON out of a Pulsar email body and writes clean JSON.

  node scripts/extract-json.mjs email-body.txt raw.json

  The Pulsar email arrives with the JSON HTML-escaped (&quot; &#39; &amp; &lt; &gt;),
  wrapped in <p> tags, and with markdown applied to it: pairs of underscores
  become <em>…</em> (so "theme_1" arrives as "theme<em>1") and double
  underscores become <strong>…</strong>. This reverses all of that, then
  takes the text from the first "{" to its matching "}" and parses it.
*/
import fs from "node:fs";

const [, , inFile, outFile] = process.argv;
if (!inFile || !outFile) { console.error("usage: extract-json.mjs <email-body.txt> <out.json>"); process.exit(1); }
let t = fs.readFileSync(inFile, "utf8");

/* a JSON-encoded string (e.g. a tool result saved as-is) */
if (/^\s*"/.test(t)) { try { t = JSON.parse(t); } catch {} }

t = t
  .replace(/<\/?strong>/gi, "__")
  .replace(/<\/?em>/gi, "_")
  .replace(/<\/?(p|br|div|span)[^>]*>/gi, "\n");

const named = { quot: '"', apos: "'", amp: "&", lt: "<", gt: ">", nbsp: " " };
const unescape = s => s
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&(quot|apos|lt|gt|nbsp);/g, (_, n) => named[n])
  .replace(/&amp;/g, "&");
t = unescape(unescape(t)); /* twice: catches &amp;quot; */

/* find the outermost object: first "{" to its matching "}", ignoring braces inside strings */
const start = t.indexOf("{");
if (start < 0) { console.error("ERROR: no '{' found in the email"); process.exit(1); }
let depth = 0, inStr = false, esc = false, end = -1;
for (let i = start; i < t.length; i++) {
  const c = t[i];
  if (inStr) { if (esc) esc = false; else if (c === "\\") esc = true; else if (c === '"') inStr = false; continue; }
  if (c === '"') inStr = true;
  else if (c === "{") depth++;
  else if (c === "}" && --depth === 0) { end = i; break; }
}
if (end < 0) { console.error("ERROR: the JSON object is not closed (email cut off?)"); process.exit(1); }

let obj;
try { obj = JSON.parse(t.slice(start, end + 1)); }
catch (e) { console.error("ERROR: JSON does not parse after cleaning: " + e.message); process.exit(1); }

const ids = (obj.themes || []).map(x => x.themeId);
const bad = ids.filter(id => !/^[A-Za-z0-9_-]+$/.test(String(id)));
if (bad.length) { console.error("ERROR: theme ids still look mangled: " + bad.join(", ")); process.exit(1); }

fs.writeFileSync(outFile, JSON.stringify(obj, null, 1) + "\n");
console.log("OK: " + ids.length + " themes (" + ids.join(", ") + "), timeframe: " + ((obj.meta && obj.meta.timeframe) || "not given"));
