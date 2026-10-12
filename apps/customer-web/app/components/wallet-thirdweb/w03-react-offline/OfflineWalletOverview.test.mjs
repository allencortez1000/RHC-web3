import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { OfflineWalletOverview } from "./OfflineWalletOverview.tsx";
import { makeSyntheticWalletFixture } from "./fixtures.ts";
import { OfflineGenerationGuard } from "../w03-offline-view/model.ts";

const render = state => renderToStaticMarkup(React.createElement(OfflineWalletOverview, { state }));
const fixture = scenario => ({ kind: "fixture", fixture: makeSyntheticWalletFixture(scenario) });
const withoutData = ["unauthenticated", "forbidden", "conflict", "rate_limited", "service_unavailable", "account_switched", "unknown"];

test("01 react component has a visible offline-only disclosure", () => {
  const html = render(fixture("unknown"));
  assert.match(html, /RHC DIGITAL \/ OFFLINE REVIEW ONLY/);
  assert.match(html, /SYNTHETIC OFFLINE FIXTURE/);
  assert.match(html, /NOT LIVE WALLET/);
});
test("02 unmounted component has an explicit data-source marker", () => assert.match(render(fixture("unknown")), /data-w03-source="synthetic-offline-only"/));
test("03 semantic region has a supported accessible name", () => assert.match(render(fixture("unknown")), /<section[^>]+aria-label="RHC wallet offline review"/));
test("04 loading renders no synthetic fixture account fields", () => {
  const s=render({kind:"loading"});
  assert.match(s,/Offline review loading/);
  assert.doesNotMatch(s,/125\.00|synthetic-customer-0001/);
});
test("05 exactly five data cards are present",()=>{
  const m=render(fixture("points"));
  assert.equal((m.match(/<article/g)||[]).length,5);
  assert.equal((m.match(/<h3/g)||[]).length,6);
});
test("06 all wallet and points action controls are missing",()=>{
  const html=render(fixture("points"));
  assert.doesNotMatch(html,/<button\b|<form\b|<input\b|<a\b|onClick|onclick|<script\b/i);
  assert.match(html,/All actions disabled/);
});
test("07 unknown link is explicitly not unlinked",()=>{
 const s=render(fixture("unknown")); assert.match(s,/Wallet link unknown/);assert.doesNotMatch(s,/Wallet unlinked/);
});
test("08 only synthetic confirmed-unlinked may show unlinked",()=>assert.match(render(fixture("unlinked")),/Wallet unlinked/));
test("09 simulated linked never represented as live verified",()=>{
 const s=render(fixture("simulated_link"));assert.match(s,/NOT live verified/);assert.match(s,/OFF-25/);
});
test("10 points observed values are labeled synthetic",()=>assert.match(render(fixture("points")),/SIMULATED RHC Points: 125\.00 points/));
test("11 points history explicitly reports simulated coverage",()=>assert.match(render(fixture("points")),/2 synthetic entries/));
test("12 default points unknown is not displayed as zero",()=>assert.match(render(fixture("unknown")),/RHC Points unavailable/));
test("13 unofficial token never displays customer on-chain balance",()=>{
 const s=render(fixture("points"));assert.match(s,/RHC token not approved \/ unavailable/);assert.doesNotMatch(s,/SIMULATED token amount/);
});
test("14 synthetic observed token zero explicitly remains simulated",()=>{
 const s=render(fixture("zero"));assert.match(s,/SIMULATED token amount: 0/);assert.match(s,/NOT an official RHC balance/);
});
test("15 history verified empty is different from unsupported",()=>{
 const s=render(fixture("zero"));assert.match(s,/Token history: simulated covered empty page/);
});
test("16 stale points do not disclose cached numeric amount",()=>{
 const s=render(fixture("stale"));assert.match(s,/RHC Points stale/);assert.doesNotMatch(s,/999999\.99/);
});
test("17 stale token does not disclose previous raw units",()=>{
 const s=render(fixture("stale"));assert.match(s,/Token source stale/);assert.doesNotMatch(s,/10000000/);
});
test("18 no implicit points to token/peso conversion",()=>{
 const s=render(fixture("points"));assert.doesNotMatch(s,/PHP|₱|USD|exchange rate|cash balance/);
});
for(const [i,reason] of withoutData.entries()){
 test((19+i)+" fail-closed "+reason+": no previous customer or points displayed",()=>{
  const s=render({kind:"unavailable",reason});
  assert.match(s,/data-w03-state="unavailable"/);
  assert.match(s,/unavailable|changed|limit reached|required|not authorized|offline/i);
  assert.doesNotMatch(s,/125\.00|SIMULATED token amount|synthetic-customer-0001/);
 });
}
test("26 authentication/error state cannot coerce into a connected link",()=>{
 const s=render({kind:"unavailable",reason:"unauthenticated"});
 assert.match(s,/Unknown/);
 assert.doesNotMatch(s,/server_verified_simulation|Linked in synthetic proof/);
});
test("27 invalid fixture-kind fails closed without throwing",()=>{
 const f=makeSyntheticWalletFixture("points");
 const s=render({kind:"fixture",fixture:{...f,fixtureKind:"UNKNOWN"}});
 assert.match(s,/Invalid synthetic fixture/);assert.doesNotMatch(s,/125\.00/);
});
test("28 production-format UUID cannot be displayed as a synthetic account",()=>{
 const f=makeSyntheticWalletFixture("points");
 const s=render({kind:"fixture",fixture:{...f,scope:{...f.scope,rhcUserId:"550e8400-e29b-41d4-a716-446655440000"}}});
 assert.match(s,/Invalid synthetic fixture/);assert.doesNotMatch(s,/125\.00/);
});
test("29 malicious account identifier is not emitted as HTML",()=>{
 const f=makeSyntheticWalletFixture("points");
 const s=render({kind:"fixture",fixture:{...f,scope:{...f.scope,rhcUserId:'synthetic-<img onerror="alert(1)">'}}});
 assert.doesNotMatch(s,/<img|onerror/);assert.match(s,/Invalid synthetic fixture/);
});
test("30 no demo point fallback after change to an error state",()=>{
 const loaded=render(fixture("points")),blocked=render({kind:"unavailable",reason:"account_switched"});
 assert.match(loaded,/125\.00/);
 assert.doesNotMatch(blocked,/125\.00/);
 assert.match(blocked,/previous customer/);
});
test("31 component is synchronous: no SDK requests or listeners in source",()=>{
 const source=fs.readFileSync(fileURLToPath(new URL("./OfflineWalletOverview.tsx",import.meta.url)),"utf8");
 assert.doesNotMatch(source,/\bfetch\s*\(|\bWebSocket\b|\bXMLHttpRequest\b|window\.|document\.|\bthirdweb\b.*from|localStorage|sessionStorage|useEffect|onClick=/i);
});
test("32 component has a responsive grid without fixed-width overflow",()=>{
 const s=render(fixture("unknown"));
 assert.match(s,/grid-template-columns:repeat\(auto-fit,\s*minmax\(min\(100%,\s*250px\),\s*1fr\)\)/i);
});
test("33 component includes a keyboard/screen-reader accessible status area",()=>{
 const s=render({kind:"unavailable",reason:"service_unavailable"});
 assert.match(s,/role="status"/);
});
test("34 source avoids visual animation and motion",()=>{
 const s=render(fixture("unknown"));
 assert.doesNotMatch(s,/animation:|transition:|autoplay|video/i);
});
test("35 source does not leak JWT, seeds or keys",()=>{
 const s=render(fixture("unknown"));
 assert.doesNotMatch(s,/eyJ[A-Za-z0-9\-_]{30,}|private.?key|mnemonic|secret.?key/i);
});
test("36 account A to B pure generation invalidates late A",()=>{
 const g=new OfflineGenerationGuard();
 const a=makeSyntheticWalletFixture().scope;
 const original=g.begin(a);
 assert.equal(g.accept(original,"A synthetic"),true);
 const b=g.begin({...a,rhcUserId:"synthetic-customer-B"});
 assert.equal(g.current(),null);
 assert.equal(g.accept(original,"late A"),false);
 assert.equal(g.accept(b,"B synthetic"),true);
});
test("37 safe default no labels suggesting official token approval",()=>{
 const s=render(fixture("unknown"));
 assert.match(s,/FAIL \/ BLOCKED/);
 assert.doesNotMatch(s,/Official RHC token verified/);
});
