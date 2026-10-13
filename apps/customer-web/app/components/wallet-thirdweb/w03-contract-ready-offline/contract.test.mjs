import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ContractReadyWalletLab } from "./ContractReadyWalletLab.tsx";
import { OfflineWalletOverview } from "../w03-react-offline/OfflineWalletOverview.tsx";
import { decodeSyntheticDraft, isMockScope, DRAFT_VERSION, OFFLINE_SOURCE } from "./draft-contract.ts";
import { makeMockScope, buildMockEnvelope } from "./mock-contract.ts";
import { OfflineContractController, makeScenarioTransport, makeDeferredTransport,
  MockReadFailure, refuseConnectedBackend } from "./offline-adapter.ts";
import { SyntheticThirdwebLifecycle } from "./thirdweb-simulator.ts";

const a=makeMockScope("synthetic-customer-A",1);
const b=makeMockScope("synthetic-customer-B",1);
const mutate=(fn,scenario="points",scope=a)=>{
 const packet=structuredClone(buildMockEnvelope(scope,scenario));fn(packet);return packet;
};
const read=(scenario="unknown",scope=a)=>decodeSyntheticDraft(buildMockEnvelope(scope,scenario),scope);
const bad=(name,fn,code,scenario="points")=>test(name,()=>{
 const result=decodeSyntheticDraft(mutate(fn,scenario),a);
 assert.equal(result.ok,false);
 if(code)assert.equal(result.code,code);
});
const render=state=>renderToStaticMarkup(React.createElement(OfflineWalletOverview,{state}));

test("01 exact declared draft version and mock-only source",()=>{
 assert.equal(DRAFT_VERSION,"w03.proposal.v0.1");
 assert.equal(OFFLINE_SOURCE,"w03-2c-synthetic-in-memory");
});
test("02 synthetic session scope accepted",()=>assert.equal(isMockScope(a),true));
test("03 real UUID scope rejected",()=>assert.equal(isMockScope({...a,rhcUserId:"550e8400-e29b-41d4-a716-446655440000"}),false));
test("04 caller-selected chain prohibited",()=>assert.equal(isMockScope({...a,chainId:"1"}),false));
test("05 caller-selected contract prohibited",()=>assert.equal(isMockScope({...a,contractAddress:"0x"+'a'.repeat(40)}),false));
test("06 negative epoch rejected",()=>assert.equal(isMockScope({...a,sessionEpoch:-1}),false));
test("07 noninteger epoch rejected",()=>assert.equal(isMockScope({...a,sessionEpoch:0.2}),false));
test("08 anonymous empty account rejected",()=>assert.equal(isMockScope({...a,rhcUserId:""}),false));

for(const scenario of ["unknown","points","zero","stale","unlinked","linked_simulation","points_empty"]){
 test("valid synthetic scenario: "+scenario,()=>{
  const output=read(scenario);
  assert.equal(output.ok,true);
  assert.equal(output.fixture.fixtureKind,"W03_OFFLINE_SYNTHETIC_ONLY");
  assert.equal(output.fixture.scope.rhcUserId,a.rhcUserId);
  assert.equal(output.fixture.token.status,"not_approved");
  assert.equal(output.fixture.token.balanceStatus,"unavailable");
  assert.equal(output.fixture.token.rawBaseUnits,null);
 });
}
test("visible 125 points strictly marked synthetic",()=>{
 const d=read("points");assert.equal(d.ok,true);
 assert.match(render({kind:"fixture",fixture:d.fixture}),/SIMULATED RHC Points: 125\.00/);
});
test("valid zero points distinct from unavailable",()=>{
 const d=read("zero");assert.equal(d.ok,true);
 assert.match(render({kind:"fixture",fixture:d.fixture}),/SIMULATED RHC Points: 0\.00/);
});
test("stale source never displays previous balance",()=>{
 const d=read("stale");assert.equal(d.ok,true);
 const s=render({kind:"fixture",fixture:d.fixture});
 assert.match(s,/RHC Points stale/);assert.doesNotMatch(s,/125\.00|999/);
});
test("unknown wallet state not unlinked or proven",()=>{
 const d=read("unknown");assert.equal(d.ok,true);
 const s=render({kind:"fixture",fixture:d.fixture});
 assert.match(s,/Wallet link unknown/);assert.doesNotMatch(s,/server proof simulation/);
});
test("simulated linked proof labeled NOT live verified",()=>{
 const d=read("linked_simulation");assert.equal(d.ok,true);
 const s=render({kind:"fixture",fixture:d.fixture});
 assert.match(s,/NOT live verified/);assert.match(s,/SYNTHETIC/);
});
test("covered empty history distinct from unavailable",()=>{
 const d=read("points_empty");assert.equal(d.ok,true);
 const s=render({kind:"fixture",fixture:d.fixture});
 assert.match(s,/Points history: simulated covered empty page/);
});
test("decoder has no custom capability elevation",()=>{
 const d=read("points");assert.equal(d.ok,true);
 assert.deepEqual(d.fixture,structuredClone(d.fixture));
 assert.equal(d.fixture.fixtureKind,"W03_OFFLINE_SYNTHETIC_ONLY");
});

bad("invalid envelope: wrong success",x=>{x.success=false;},"invalid_envelope");
bad("invalid envelope: missing meta",x=>{delete x.meta;},"invalid_envelope");
bad("invalid envelope: missing data",x=>{delete x.data;},"invalid_envelope");
bad("invalid envelope: injected extra root field",x=>{x.user_jwt="secret";},"invalid_envelope");
bad("unapproved source: wrong global marker",x=>{x.data.source="rhc_live_api";},"untrusted_source");
bad("wrong version rejected",x=>{x.data.contract_version="w03.v1";},"contract_mismatch");
bad("wrong pilot mode rejected",x=>{x.data.wallet_view_mode="LIVE_TRADING";},"contract_mismatch");
bad("wrong RHC user rejected",x=>{x.data.rhc_user_id=b.rhcUserId;},"account_mismatch");
bad("wrong source revision rejected",x=>{x.data.scope_revision="synthetic-source-r99";},"account_mismatch");
bad("unapproved connect action rejected",x=>{x.data.capabilities.can_connect=true;},"unapproved_capability");
bad("unapproved redeem action rejected",x=>{x.data.capabilities.can_redeem=true;},"unapproved_capability");
bad("unapproved transfer action rejected",x=>{x.data.capabilities.can_transfer=true;},"unapproved_capability");
bad("extra capability key rejected",x=>{x.data.capabilities.can_mint=false;},"unapproved_capability");
bad("points as JavaScript float rejected",x=>{x.data.points.balance_decimal=125.55;},"invalid_envelope");
bad("points decimal precision rejected",x=>{x.data.points.balance_decimal="125.555";},"invalid_envelope");
bad("points negative rejected",x=>{x.data.points.balance_decimal="-1.00";},"invalid_envelope");
bad("points scientific notation rejected",x=>{x.data.points.balance_decimal="1e9";},"invalid_envelope");
bad("stale source claiming amount rejected",x=>{x.data.points.balance_decimal="900.00";},"invalid_envelope","stale");
bad("unexpected points source rejected",x=>{x.data.points.source="onchain";},"invalid_envelope");
bad("token source real provider rejected",x=>{x.data.token.source="thirdweb";},"untrusted_source");
bad("token official identity rejected",x=>{x.data.token.official_identity="verified";},"untrusted_source");
bad("token contract address rejected",x=>{x.data.token.contract_address="0x"+'1'.repeat(40);},"untrusted_source");
bad("token chain id rejected",x=>{x.data.token.chain_id="1";},"untrusted_source");
bad("token observed balance rejected",x=>{x.data.token.balance.status="observed";},"untrusted_source");
bad("token raw amount rejected",x=>{x.data.token.balance.raw_base_units="0";},"untrusted_source");
bad("token decimals rejected",x=>{x.data.token.balance.decimals=18;},"untrusted_source");
bad("token transfer history observed rejected",x=>{x.data.token.history.status="observed";x.data.token.history.items=[];x.data.token.history.coverage_complete=true;},"untrusted_source");
bad("unsupported token status rejected",x=>{x.data.token.status="observed";},"untrusted_source");
bad("unknown linked proof rejected",x=>{x.data.wallet_link.state="linked";},"invalid_envelope");
bad("linked address actual hex rejected",x=>{
 x.data.wallet_link.state="linked";x.data.wallet_link.verification="server_verified";
 x.data.wallet_link.link_id="synthetic-linkproof-A";x.data.wallet_link.address_display="0x"+'a'.repeat(40);
},"invalid_envelope");
bad("fake unverified link address rejected",x=>{x.data.wallet_link.address_display="synthetic-wallet-A";},"invalid_envelope");
bad("link revision mismatch rejected",x=>{x.data.wallet_link.revision="synthetic-other";},"invalid_envelope");
bad("invalid link enum rejected",x=>{x.data.wallet_link.state="activated";},"invalid_envelope");
bad("invalid ISO timestamp rejected",x=>{x.data.as_of="not-a-date";},"invalid_envelope");
bad("ISO date-only timestamp rejected",x=>{x.data.as_of="2026-10-13";},"invalid_envelope");
bad("ISO timezone offset timestamp rejected",x=>{x.data.as_of="2026-10-13T00:00:00+08:00";},"invalid_envelope");
bad("invalid calendar day timestamp rejected",x=>{x.data.as_of="2026-02-30T00:00:00.000Z";},"invalid_envelope");
bad("uncovered history empty claims rejected",x=>{x.data.points.history.coverage_complete=false;},"invalid_envelope");
bad("history item from a real customer rejected",x=>{x.data.points.history.items=["user@example.com"];},"invalid_envelope");
bad("history items null while observed rejected",x=>{x.data.points.history.items=null;},"invalid_envelope");
bad("empty means zero items only",x=>{x.data.points.history.status="empty";},"invalid_envelope");
bad("extra private profile field rejected",x=>{x.data.customer_email="real@example.com";},"invalid_envelope");
bad("tampered request id rejected",x=>{x.meta.request_id="<script>";},"invalid_envelope");

test("decoder fails closed with null and missing fields",()=>{
 for(const v of [null,42,[],{},Object.create(null),"token",false]){
   assert.equal(decodeSyntheticDraft(v,a).ok,false);
 }
});
test("mock transport factory returns only synthetic data",async()=>{
 const adapter=new OfflineContractController(makeScenarioTransport("points"));
 const response=await adapter.load(a);assert.equal(response.kind,"fixture");
 assert.match(render(response),/125\.00/);
});
test("unregistered transport cannot be passed as a live API adapter",()=>{
 assert.throws(()=>new OfflineContractController({kind:"in_memory_synthetic",read:async()=>buildMockEnvelope(a,"points")}),/Unapproved transport refused/);
});
test("connected backend mode intentionally unavailable",()=>{
 assert.deepEqual(refuseConnectedBackend(),{kind:"unavailable",reason:"service_unavailable"});
});
test("no stale points after 401 logout",async()=>{
 const c=new OfflineContractController(makeScenarioTransport("points"));
 await c.load(a);assert.equal(c.snapshot().kind,"fixture");
 c.clear("unauthenticated");
 assert.equal(c.snapshot().kind,"unavailable");
 assert.doesNotMatch(render(c.snapshot()),/125\.00/);
});
test("no stale points after wrong company/session or user change",async()=>{
 const c=new OfflineContractController(makeScenarioTransport("points"));
 await c.load(a);
 const other={...b,sessionEpoch:3};
 const r=await c.load(other);
 assert.equal(r.kind,"fixture");
 assert.equal(r.fixture.scope.rhcUserId,other.rhcUserId);
 assert.notEqual(r.fixture.scope.rhcUserId,a.rhcUserId);
});
test("same user new epoch supersedes pending old epoch",async()=>{
 const deferred=makeDeferredTransport(),c=new OfflineContractController(deferred.transport);
 const old=c.load(a),newScope={...a,sessionEpoch:2},next=c.load(newScope);
 assert.equal(deferred.pending(),2);
 deferred.resolve(1,buildMockEnvelope(newScope,"points"));
 assert.equal((await next).kind,"fixture");
 deferred.resolve(0,buildMockEnvelope(a,"zero"));
 assert.equal((await old).kind,"unavailable");
 assert.match(render(c.snapshot()),/125\.00/);
});
test("account B wins even if account A completes last",async()=>{
 const t=makeDeferredTransport(),c=new OfflineContractController(t.transport);
 const ra=c.load(a),rb=c.load(b);
 t.resolve(1,buildMockEnvelope(b,"zero"));await rb;
 t.resolve(0,buildMockEnvelope(a,"points"));await ra;
 const view=c.snapshot();
 assert.equal(view.kind,"fixture");
 assert.equal(view.fixture.scope.rhcUserId,b.rhcUserId);
 assert.match(render(view),/0\.00/);
 assert.doesNotMatch(render(view),/125\.00/);
});
test("manual invalidation cancels late pending",async()=>{
 const t=makeDeferredTransport(),c=new OfflineContractController(t.transport);
 const wait=c.load(a);
 c.clear("account_switched");
 t.resolve(0,buildMockEnvelope(a,"points"));
 assert.equal((await wait).kind,"unavailable");
 assert.equal(c.snapshot().kind,"unavailable");
});
test("malformed payload clears last valid balance",async()=>{
 const t=makeDeferredTransport(),c=new OfflineContractController(t.transport);
 let one=c.load(a);t.resolve(0,buildMockEnvelope(a,"points"));await one;
 let two=c.load(a);t.resolve(1,{success:true,data:{}});await two;
 assert.equal(c.snapshot().kind,"unavailable");
 assert.doesNotMatch(render(c.snapshot()),/125\.00/);
});
test("wrong customer response clears prior state and signals conflict",async()=>{
 const t=makeDeferredTransport(),c=new OfflineContractController(t.transport);
 let one=c.load(a);t.resolve(0,buildMockEnvelope(a,"points"));await one;
 let two=c.load(a);t.resolve(1,buildMockEnvelope(b,"points"));const out=await two;
 assert.deepEqual(out,{kind:"unavailable",reason:"conflict"});
});
for(const status of ["unauthenticated","forbidden","conflict","rate_limited","service_unavailable"]){
 test("simulated "+status+" error fails closed",async()=>{
  const t=makeDeferredTransport(),c=new OfflineContractController(t.transport);
  const p=c.load(a);t.reject(0,new MockReadFailure(status));
  assert.deepEqual(await p,{kind:"unavailable",reason:status});
  assert.doesNotMatch(render(c.snapshot()),/125\.00/);
 });
}
test("unexpected promise error is sanitized",async()=>{
 const t=makeDeferredTransport(),c=new OfflineContractController(t.transport);
 const p=c.load(a);t.reject(0,new Error("Sensitive network details"));
 assert.deepEqual(await p,{kind:"unavailable",reason:"service_unavailable"});
 assert.doesNotMatch(render(c.snapshot()),/Sensitive network details/);
});
test("invalid scope never starts a mock request",async()=>{
 const t=makeDeferredTransport(),c=new OfflineContractController(t.transport);
 const r=await c.load({...a,rhcUserId:"production-real-id"});
 assert.equal(r.kind,"unavailable");assert.equal(t.pending(),0);
});
test("double-settle of a synthetic request is rejected",async()=>{
 const t=makeDeferredTransport(),c=new OfflineContractController(t.transport);
 const p=c.load(a);t.resolve(0,buildMockEnvelope(a));await p;
 assert.throws(()=>t.resolve(0,buildMockEnvelope(a)),/settled/);
});

test("Thirdweb simulator starts disconnected without permissions",()=>{
 const life=new SyntheticThirdwebLifecycle();
 assert.deepEqual(life.snapshot(),{phase:"disconnected",syntheticAccount:null,network:null,
   verifiedRhcLink:false,canSign:false,canTransact:false});
});
test("Thirdweb simulated connect never verifies RHC link",()=>{
 const life=new SyntheticThirdwebLifecycle();
 const ticket=life.begin(a);
 assert.equal(life.complete(ticket,"synthetic-wallet-A"),true);
 assert.equal(life.snapshot().phase,"connected_simulation");
 assert.equal(life.snapshot().verifiedRhcLink,false);
 assert.equal(life.snapshot().canTransact,false);
 assert.equal(life.snapshot().canSign,false);
});
test("Thirdweb real EOA hex cannot enter mock connection",()=>{
 const life=new SyntheticThirdwebLifecycle(),t=life.begin(a);
 assert.equal(life.complete(t,"0x"+'a'.repeat(40)),false);
 assert.equal(life.snapshot().syntheticAccount,null);
});
test("Thirdweb invalid scope cannot start",()=>{
 const l=new SyntheticThirdwebLifecycle();assert.equal(l.begin({...a,chainId:"1"}),null);
});
test("Thirdweb wrong chain clears mock account",()=>{
 const l=new SyntheticThirdwebLifecycle(),t=l.begin(a);l.complete(t,"synthetic-wallet-A");
 assert.equal(l.wrongNetwork(t),true);
 assert.equal(l.snapshot().phase,"unsupported_network");
 assert.equal(l.snapshot().syntheticAccount,null);
});
test("Thirdweb disconnect clears all state",()=>{
 const l=new SyntheticThirdwebLifecycle(),t=l.begin(a);l.complete(t,"synthetic-wallet-A");
 l.disconnect();assert.equal(l.snapshot().phase,"disconnected");assert.equal(l.snapshot().syntheticAccount,null);
});
test("Thirdweb account switch invalidates late completions",()=>{
 const l=new SyntheticThirdwebLifecycle();
 const old=l.begin(a);const next=l.begin(b);
 assert.equal(l.complete(old,"synthetic-wallet-A"),false);
 assert.equal(l.complete(next,"synthetic-wallet-B"),true);
 assert.equal(l.snapshot().syntheticAccount,"synthetic-wallet-B");
});
test("Thirdweb fail resets connectivity with no network",()=>{
 const l=new SyntheticThirdwebLifecycle(),t=l.begin(a);
 assert.equal(l.fail(t),true);assert.equal(l.snapshot().phase,"unavailable");
 assert.equal(l.snapshot().canTransact,false);
});
test("Thirdweb stale failure cannot clobber next identity",()=>{
 const l=new SyntheticThirdwebLifecycle(),old=l.begin(a),current=l.begin(b);
 assert.equal(l.fail(old),false);
 assert.equal(l.complete(current,"synthetic-wallet-B"),true);
});
test("React harness SSR starts loading and names contract preview",()=>{
 const c=new OfflineContractController(makeScenarioTransport("points"));
 const html=renderToStaticMarkup(React.createElement(ContractReadyWalletLab,
   {mode:"synthetic",scope:a,controller:c}));
 assert.match(html,/W03-2C contract rehearsal/);
 assert.match(html,/Offline review loading/);
 assert.doesNotMatch(html,/125\.00/);
});
test("React backend pending SSR never fetches demo balance",()=>{
 const c=new OfflineContractController(makeScenarioTransport("points"));
 const html=renderToStaticMarkup(React.createElement(ContractReadyWalletLab,
   {mode:"backend_pending",scope:a,controller:c}));
 assert.doesNotMatch(html,/125\.00/);
 assert.match(html,/w03-2c-mode="backend_pending"/);
});
