/*
  Password gate for the whole site (pages AND data files).
  Runs on the host's edge before anything is served:
    Netlify -> netlify/edge-functions/gate.js
    Vercel  -> middleware.js
  Set the password as an environment variable on the host: SITE_PASSWORD.
  Changing SITE_PASSWORD signs everyone out.

  gate(request, password) returns a Response to send (login page, redirect),
  or null to let the request through to the site.
*/
const COOKIE = "ecs_auth";
const MAX_AGE = 60 * 60 * 24 * 30; // stay signed in for 30 days

async function tokenFor(password) {
  const data = new TextEncoder().encode("ecs-site-gate:v1:" + password);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, "0")).join("");
}

function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

function readCookie(request, name) {
  const raw = request.headers.get("cookie") || "";
  for (const part of raw.split(/;\s*/)) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i) === name) return decodeURIComponent(part.slice(i + 1));
  }
  return null;
}

const noStore = { "cache-control": "no-store", "x-robots-tag": "noindex, nofollow" };

function loginPage(status, error, next) {
  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>ALDI Belgium: Early Christmas Signals</title>
<style>
:root{--space:#182141;--blue:#0068FD;--tint:#94C0FF;--orange:#EE7241;--line:rgba(148,192,255,.28)}
*{box-sizing:border-box}html,body{height:100%;margin:0}
body{background:radial-gradient(1200px 600px at 70% -10%,#26326a 0,var(--space) 60%);color:#fff;font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;display:flex;align-items:center;justify-content:center;padding:24px}
.card{width:100%;max-width:400px;background:rgba(255,255,255,.04);border:1px solid var(--line);border-radius:18px;padding:32px}
.mark{display:flex;align-items:center;gap:10px;font-weight:600;letter-spacing:.01em;margin-bottom:28px}
.mark svg{width:18px;height:18px}
h1{font-size:1.6rem;line-height:1.2;margin:0 0 6px;font-weight:600}
p{margin:0 0 24px;color:var(--tint);font-size:.95rem}
label{display:block;font-size:.8rem;color:rgba(255,255,255,.75);margin-bottom:8px}
input{width:100%;padding:12px 14px;border-radius:10px;border:1px solid var(--line);background:rgba(255,255,255,.06);color:#fff;font:inherit;font-size:1rem}
input:focus{outline:2px solid var(--blue);outline-offset:1px}
button{margin-top:16px;width:100%;padding:12px;border:0;border-radius:999px;background:var(--blue);color:#fff;font:inherit;font-weight:600;font-size:1rem;cursor:pointer}
button:hover{filter:brightness(1.08)}
.err{margin:14px 0 0;color:#FFB59A;font-size:.88rem}
</style></head>
<body><main class="card">
<div class="mark"><svg viewBox="0 0 100 100" aria-hidden="true"><path d="M50 2C54 38 62 46 98 50C62 54 54 62 50 98C46 62 38 54 2 50C38 46 46 38 50 2Z" fill="#EE7241"/></svg>Pulsar</div>
<h1>Early Christmas Signals</h1>
<p>ALDI Belgium</p>
<form method="post" action="/__login">
<input type="hidden" name="next" value="${String(next).replace(/[&<>"']/g, c => "&#" + c.charCodeAt(0) + ";")}">
<label for="pw">Password · Mot de passe · Wachtwoord</label>
<input id="pw" name="password" type="password" autocomplete="current-password" required autofocus>
<button type="submit">Open the report</button>
${error ? '<p class="err" role="alert">That password is not right. Please try again.</p>' : ""}
</form></main>
<script>try{var n=document.querySelector('[name=next]');if(location.hash&&n.value.indexOf("#")<0)n.value+=location.hash;}catch(e){}</script>
</body></html>`;
  return new Response(html, { status, headers: { "content-type": "text/html; charset=utf-8", ...noStore } });
}

function safeNext(v) {
  return typeof v === "string" && v.startsWith("/") && !v.startsWith("//") && !v.startsWith("/__") ? v : "/";
}

export async function gate(request, password) {
  if (!password) {
    return new Response("Site password is not configured. Set SITE_PASSWORD on the host and redeploy.", { status: 503, headers: { "content-type": "text/plain; charset=utf-8", ...noStore } });
  }
  const url = new URL(request.url);
  const token = await tokenFor(password);

  if (url.pathname === "/__login" && request.method === "POST") {
    let form;
    try { form = await request.formData(); } catch { form = new FormData(); }
    const next = safeNext(form.get("next"));
    if (safeEqual(String(form.get("password") || ""), password)) {
      const secure = url.protocol === "https:" ? "; Secure" : "";
      return new Response(null, { status: 303, headers: {
        location: next, ...noStore,
        "set-cookie": `${COOKIE}=${token}; Path=/; Max-Age=${MAX_AGE}; HttpOnly; SameSite=Lax${secure}`
      }});
    }
    await new Promise(r => setTimeout(r, 800)); // slow down guessing
    return loginPage(401, true, next);
  }

  if (url.pathname === "/__logout") {
    return new Response(null, { status: 303, headers: { location: "/", ...noStore, "set-cookie": `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax` } });
  }

  if (safeEqual(readCookie(request, COOKIE) || "", token)) return null; // signed in: serve the site

  if (request.method === "GET" && (url.pathname === "/" || url.pathname.endsWith(".html"))) {
    return loginPage(401, false, url.pathname + url.hash);
  }
  return new Response("Unauthorized", { status: 401, headers: { "content-type": "text/plain; charset=utf-8", ...noStore } });
}
