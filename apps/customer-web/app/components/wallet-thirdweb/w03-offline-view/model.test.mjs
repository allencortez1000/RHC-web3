// Node 24 built-in test runner, synthetic in-memory data ONLY. No provider/network import.
import {test} from "node:test";
import assert from "node:assert/strict";
import {
 FIXTURE_MARKER, deriveOfflineView, formatTokenBaseUnits,validPointsDecimal,
 historyLabel, OfflineGenerationGuard,
} from "./model.ts";
import {renderStandaloneOfflineHtml} from "./render.ts";

function fixture(){
 return {
  fixtureKind:FIXTURE_MARKER,
  scope:{rhcUserId:"synthetic-user-A",sessionEpoch:1,linkRevision:"unknown",chainId:null,contractAddress:null,sourceRevision:"fixture-v1"},
  link:{state:"unknown",verification:"not_verified",durableProofSimulation:false},
  points:{status:"unavailable",balanceDecimal:null,history:{status:"unavailable",itemCount:null,coverageComplete:false}},
  token:{status:"not_approved",balanceStatus:"unavailable",rawBaseUnits:null,decimals:null,history:{status:"unsupported",itemCount:null,coverageComplete:false}},
 };
}
const derive = fn => {const f=fixture();fn?.(f);return deriveOfflineView(f)};
test("01 synthetic marker strictly required",()=>assert.throws(()=>deriveOfflineView({...fixture(),fixtureKind:"REAL_DATA"}),/rejected/));
test("02 fixture notice cannot suggest live data",()=>assert.match(derive().fixtureNotice,/NOT LIVE WALLET/));
test("03 all wallet capabilities permanently false",()=>assert.ok(Object.values(derive().capabilities).every(v=>v===false)));
test("04 unknown wallet state is not unlinked",()=>assert.match(derive().linkLabel,/unknown/));
for(const state of ["unlinked","pending","revoked","conflict"]){
 test("05-08 explicit wallet "+state,()=>assert.match(derive(f=>f.link.state=state).linkLabel,new RegExp(state)));
}
test("09 browser linked claim without proof rejected",()=>assert.match(derive(f=>f.link.state="linked").linkLabel,/rejected/));
test("10 fake proof still labeled synthetic",()=>assert.match(derive(f=>{f.link.state="linked";f.link.verification="server_verified_simulation";f.link.durableProofSimulation=true}).linkLabel,/NOT live verified/));
test("11 points missing is NOT zero",()=>assert.match(derive().pointsLabel,/not zero/i));
test("12 points observed 0 is explicitly synthetic",()=>assert.match(derive(f=>{f.points.status="observed";f.points.balanceDecimal="0.00"}).pointsLabel,/SIMULATED RHC Points: 0.00/));
test("13 large decimal strings not converted to numbers",()=>assert.match(derive(f=>{f.points.status="observed";f.points.balanceDecimal="1234567890123456.70"}).pointsLabel,/1234567890123456.70/));
test("14 fractional misprecision rejected",()=>assert.match(derive(f=>{f.points.status="observed";f.points.balanceDecimal="2.345"}).pointsLabel,/invalid/));
test("15 negative points rejected",()=>assert.equal(validPointsDecimal("-1.00"),false));
test("16 scientific points notation rejected",()=>assert.equal(validPointsDecimal("1e3"),false));
test("17 missing points observation never accepted",()=>assert.match(derive(f=>f.points.status="observed").pointsLabel,/unavailable/));
test("18 stale points do not show stored amount",()=>assert.match(derive(f=>{f.points.status="stale";f.points.balanceDecimal="89.00"}).pointsLabel,/stale/));
test("19 disabled points distinct",()=>assert.match(derive(f=>f.points.status="disabled").pointsLabel,/disabled/));
test("20 unsupported points distinct",()=>assert.match(derive(f=>f.points.status="unsupported").pointsLabel,/unsupported/));
test("21 official token not approved never shown as zero",()=>assert.match(derive().tokenLabel,/NOT zero/));
test("22 precise zero token only with simulated observed source",()=>assert.match(derive(f=>{f.token.status="observed";f.token.balanceStatus="observed";f.token.rawBaseUnits="0";f.token.decimals=18}).tokenLabel,/SIMULATED token amount: 0/));
test("23 > 2^53 raw token units retain precision",()=>assert.equal(formatTokenBaseUnits("900719925474099312345",18),"900.719925474099312345"));
test("24 token exact 0 decimals",()=>assert.equal(formatTokenBaseUnits("000998",0),"998"));
test("25 invalid negative token rejected",()=>assert.equal(formatTokenBaseUnits("-1",18),null));
test("26 malformed raw hex token rejected",()=>assert.equal(formatTokenBaseUnits("0x10",18),null));
test("27 max supported decimals",()=>assert.equal(formatTokenBaseUnits("1",255),"0."+"0".repeat(254)+"1"));
test("28 too many decimals rejected",()=>assert.equal(formatTokenBaseUnits("1",256),null));
test("29 float decimals rejected",()=>assert.equal(formatTokenBaseUnits("1",1.5),null));
test("30 stale token cannot present fresh amount",()=>assert.match(derive(f=>{f.token.status="stale";f.token.balanceStatus="observed";f.token.rawBaseUnits="1";f.token.decimals=0}).tokenLabel,/stale/));
test("31 disabled token distinct",()=>assert.match(derive(f=>f.token.status="disabled").tokenLabel,/disabled/));
test("32 unsupported token distinct",()=>assert.match(derive(f=>f.token.status="unsupported").tokenLabel,/unsupported/));
test("33 history unavailable not empty",()=>assert.match(historyLabel({status:"unavailable",itemCount:null,coverageComplete:false},"Token"),/not empty/));
test("34 empty without coverage is unavailable",()=>assert.match(historyLabel({status:"empty",itemCount:0,coverageComplete:false},"Token"),/incomplete coverage/));
test("35 covered zero is explicitly simulated",()=>assert.match(historyLabel({status:"empty",itemCount:0,coverageComplete:true},"Token"),/simulated covered empty/));
test("36 observed with negative count invalid",()=>assert.match(historyLabel({status:"observed",itemCount:-1,coverageComplete:true},"Points"),/unavailable/));
test("37 observed with data count explicit synthetic",()=>assert.match(historyLabel({status:"observed",itemCount:2,coverageComplete:true},"Points"),/2 synthetic entries/));
test("38 history stale distinct",()=>assert.match(historyLabel({status:"stale",itemCount:9,coverageComplete:false},"Points"),/stale/));
test("39 history disabled distinct",()=>assert.match(historyLabel({status:"disabled",itemCount:0,coverageComplete:false},"Points"),/disabled/));
test("40 history unsupported distinct",()=>assert.match(historyLabel({status:"unsupported",itemCount:null,coverageComplete:false},"Points"),/unsupported/));
test("41 initial guard is empty",()=>assert.equal(new OfflineGenerationGuard().current(),null));
test("42 account switch clears A immediately and rejects late A",()=>{
 const g=new OfflineGenerationGuard();const a=fixture().scope;const old=g.begin(a);
 assert.equal(g.accept(old,"A synthetic data"),true);
 const b={...a,rhcUserId:"synthetic-user-B"};const ticket=g.begin(b);
 assert.equal(g.current(),null);
 assert.equal(g.accept(old,"A stale response"),false);
 assert.equal(g.accept(ticket,"B synthetic data"),true);
 assert.equal(g.current(),"B synthetic data");
});
test("43 even identical-scope older ticket rejected after new request",()=>{
 const g=new OfflineGenerationGuard();const s=fixture().scope;const a=g.begin(s);const b=g.begin(s);
 assert.equal(g.accept(a,1),false);assert.equal(g.accept(b,2),true);
});
for(const field of ["sessionEpoch","linkRevision","chainId","contractAddress","sourceRevision"]){
 test("44-48 scope change invalidation: "+field,()=>{
  const g=new OfflineGenerationGuard();const s=fixture().scope;const old=g.begin(s);
  const v=field==="sessionEpoch"?2:field==="chainId"?"11155111":field==="contractAddress"?"0xDEADBEEF":field+"-new";
  const now=g.begin({...s,[field]:v});
  assert.equal(g.accept(old,"WRONG"),false);assert.equal(g.current(),null);
  assert.equal(g.accept(now,"NEW"),true);
 });
}
test("49 logout invalidate drops cached state and blocks late result",()=>{
 const g=new OfflineGenerationGuard();const ticket=g.begin(fixture().scope);
 g.accept(ticket,"SYNTHETIC");g.invalidate();
 assert.equal(g.current(),null);assert.equal(g.accept(ticket,"LATE"),false);
});
test("50 HTML has offline-only CSP and no executable scripts",()=>{
 const html=renderStandaloneOfflineHtml(derive());
 assert.match(html,/connect-src 'none'/);assert.match(html,/script-src 'none'/);
 assert.doesNotMatch(html,/<script[\s>]/);
});
test("51 HTML is escaped against injected fixture strings",()=>{
 const m={...derive(),accountKey:'<img src=x onerror="alert(1)">'};
 const html=renderStandaloneOfflineHtml(m);
 assert.doesNotMatch(html,/<img src=x/);
 assert.match(html,/&lt;img src=x/);
});
test("52 HTML contains responsive and reduced-motion declarations",()=>{
 const html=renderStandaloneOfflineHtml(derive());
 assert.match(html,/@media\(max-width:660px\)/);
 assert.match(html, /prefers-reduced-motion/);
});
test("53 HTML has no forms or wallet operations",()=>{
 const html=renderStandaloneOfflineHtml(derive());
 assert.doesNotMatch(html,/<form[\s>]/);assert.doesNotMatch(html,/<button[\s>]/);
 assert.match(html,/All actions disabled/);
});
test("54 identity injection cannot enable capabilities",()=>{
 const m=derive(f=>{f.scope.rhcUserId="synthetic-<script>";f.link.state="linked";f.link.verification="server_verified_simulation";f.link.durableProofSimulation=true});
 assert.ok(Object.values(m.capabilities).every(v=>v===false));
 assert.doesNotMatch(renderStandaloneOfflineHtml(m),/<script>/);
});
