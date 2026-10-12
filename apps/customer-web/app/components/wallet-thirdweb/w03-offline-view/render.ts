import type { ViewModel } from "./model.ts";

/** Completely static HTML proof-of-concept, deliberately NOT mounted in customer-web. */
function escaped(v:string):string {
  return v.replace(/&/g,"&amp;").replace(/</g,"&lt;")
    .replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
}
export function renderStandaloneOfflineHtml(m:ViewModel):string {
  const cells = [
    ["Wallet linkage",m.linkLabel],
    ["Centralized RHC Points",m.pointsLabel],
    ["Points history",m.pointsHistoryLabel],
    ["Blockchain token",m.tokenLabel],
    ["Token transfer history",m.tokenHistoryLabel],
  ].map(([label,value]) =>
    '<article class="cell"><h2>'+escaped(label)+'</h2><p>'+escaped(value)+'</p></article>').join("\n");
  const warnings=m.warnings.map(w=>'<li>'+escaped(w)+'</li>').join("");
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; connect-src 'none'; form-action 'none'; img-src 'none'; script-src 'none'">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>RHC W03 Offline Wallet View — Synthetic Only</title>
<style>
:root{font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#133047;background:#edf7fb}
*{box-sizing:border-box}body{margin:0;min-height:100vh;background:radial-gradient(circle at 13% 5%,#d4f6ff,transparent 46%),linear-gradient(135deg,#f7fcff,#e9f3fa)}
main{max-width:1080px;margin:0 auto;padding:34px 20px 60px}
.shell{padding:30px;border:1px solid rgba(255,255,255,.92);border-radius:26px;background:rgba(255,255,255,.78);box-shadow:0 20px 75px rgba(35,91,128,.10)}
.brand{font-size:.76rem;letter-spacing:.16em;font-weight:800;color:#036d94;text-transform:uppercase}
h1{font-size:clamp(1.65rem,3.6vw,2.5rem);margin:13px 0 8px}p{line-height:1.55}
.notice{border:1px solid #9bd8ed;border-left:5px solid #00a2d9;background:#e5f8ff;padding:13px 16px;border-radius:10px;font-weight:800;letter-spacing:.01em;font-size:.88rem}
.small{color:#536a79;font-size:.9rem}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin-top:24px}
.cell{border:1px solid #d8eaf0;background:rgba(255,255,255,.89);border-radius:16px;padding:18px 20px;min-width:0}
.cell h2{margin:0 0 9px;font-size:.95rem;color:#3b6678}.cell p{font-size:1.07rem;font-weight:700;margin:0;overflow-wrap:anywhere}
.warnings{padding:16px 21px;border-radius:14px;background:#fff9e9;border:1px solid #f2dfad;margin-top:18px}
.warnings h2{margin:0 0 8px;font-size:1rem}.warnings ul{margin:0;padding-left:19px}.warnings li{margin-bottom:4px}
.lock{margin-top:16px;padding:13px 17px;background:#f0f5f8;border:1px solid #d0e1e9;border-radius:12px;color:#365268}
footer{margin-top:16px;font-size:.82rem;color:#536a79}
@media(max-width:660px){.grid{grid-template-columns:1fr}main{padding:13px}.shell{padding:18px}}
@media(prefers-reduced-motion:reduce){*,*:before,*:after{animation:none!important;transition:none!important}}
</style></head><body><main><section class="shell">
<div class="brand">RHC DIGITAL / OFFLINE UI REHEARSAL</div>
<h1>Wallet, points &amp; token state</h1>
<p class="small">Account fixture: ${escaped(m.accountKey)}. Read-only design rehearsal; no wallet linked and no backend data retrieved.</p>
<div class="notice" role="status">${escaped(m.fixtureNotice)}</div>
<div class="grid">${cells}</div>
<aside class="warnings"><h2>Open acceptance gates</h2><ul>${warnings}</ul></aside>
<div class="lock">All actions disabled: connect · link · transfer · approve · trade · redeem</div>
<footer>No JavaScript, no network, no wallet, no credential, no API, no transactions. Not a deployment artifact.</footer>
</section></main></body></html>`;
}
