import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  PARTITION_FIXTURE, RECORD_FIXTURE, isOfflineAccountScope,
  deriveOfflineNetworkPartition,
} from "./partition.ts";
import { OfflineNetworkPartitionPreview } from "./OfflineNetworkPartitionPreview.tsx";

function scope(change = {}) {
  return {
    fixtureKind: PARTITION_FIXTURE,
    rhcUserId: "synthetic-user-alpha",
    sessionEpoch: 1,
    linkRevision: "synthetic-link-initial",
    sourceRevision: "synthetic-source-one",
    ...change,
  };
}
function record(change = {}) {
  return {
    fixtureKind: RECORD_FIXTURE,
    scope: scope(),
    layer: "synthetic-l1",
    assetKey: "synthetic-asset-abc",
    balanceState: "unavailable",
    rawBaseUnits: null,
    decimals: null,
    movement: "none",
    ...change,
  };
}
const read = (records = [record()], s = scope()) => deriveOfflineNetworkPartition(s, records);
const unavailable = outcome => {
  assert.equal(outcome.kind, "unavailable");
  assert.deepEqual(outcome.rows, []);
  assert.equal(outcome.combinedTotal, null);
  assert.match(outcome.notice, /NOT zero/);
  assert.ok(Object.values(outcome.capabilities).every(flag => flag === false));
};
const render = (records = [record()], s = scope()) =>
  renderToStaticMarkup(React.createElement(OfflineNetworkPartitionPreview, { records, scope: s }));

test("01 valid invented account scope is accepted without any real ID", () => {
  assert.equal(isOfflineAccountScope(scope()), true);
  assert.equal(isOfflineAccountScope({ ...scope(), rhcUserId: "normal-real-uuid" }), false);
});
test("02 any real-looking user identifier fails closed", () => unavailable(read([record()], { ...scope(), rhcUserId: "550e8400-e29b-41d4-a716-446655440000" })));
test("03 omitted required session identity fails closed", () => {
  const x = scope(); delete x.linkRevision; unavailable(read([record()], x));
});
test("04 scope extra chainId fails closed", () => unavailable(read([record()], { ...scope(), chainId: 1 })));
test("05 scope extra on-chain contract fails closed", () => unavailable(read([record()], { ...scope(), contractAddress: "0x" + "1".repeat(40) })));
test("06 scope requires a positive safe session epoch", () => {
  for (const n of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, null, "1"]) {
    unavailable(read([record()], { ...scope(), sessionEpoch: n }));
  }
});
test("07 no records is unavailable and not a confirmed empty balance", () => unavailable(read([])));
test("08 non-array records are rejected", () => {
  for (const value of [null, undefined, {}, "hello", new Set()]) unavailable(deriveOfflineNetworkPartition(scope(), value));
});
test("09 a genuine one-layer synthetic fixture is labeled offline", () => {
  const v = read(); assert.equal(v.kind, "synthetic-review");
  assert.match(v.notice, /NO official|No official/);
  assert.equal(v.rows.length, 1);
  assert.equal(v.rows[0].layerLabel, "Synthetic L1 slot");
  assert.equal(v.rows[0].syntheticOnly, true);
});
test("10 exact observed synthetic zero is distinct from unavailable", () => {
  const v = read([record({balanceState:"observed",rawBaseUnits:"0",decimals:18})]);
  assert.match(v.rows[0].amountLabel, /SIMULATED 0 \(NOT an official/);
});
test("11 observed value preserves >2^53 precision", () => {
  const v = read([record({balanceState:"observed",rawBaseUnits:"900719925474099312345",decimals:18})]);
  assert.match(v.rows[0].amountLabel, /900\.719925474099312345/);
});
test("12 18-decimal fractional value is not rounded by Number", () => {
  const v = read([record({balanceState:"observed",rawBaseUnits:"1",decimals:18})]);
  assert.match(v.rows[0].amountLabel, /SIMULATED 0\.000000000000000001/);
});
test("13 unavailable cannot carry a stale numeric balance", () =>
  unavailable(read([record({balanceState:"unavailable",rawBaseUnits:"10",decimals:18})])));
test("14 stale cannot carry a cached token amount", () =>
  unavailable(read([record({balanceState:"stale",rawBaseUnits:"20",decimals:18})])));
test("15 observed must supply raw units and precision", () => {
  unavailable(read([record({balanceState:"observed",rawBaseUnits:null,decimals:18})]));
  unavailable(read([record({balanceState:"observed",rawBaseUnits:"1",decimals:null})]));
});
test("16 raw base units reject scientific notation, negative, hex and floats", () => {
  for (const raw of ["1e8","-1","0x10","1.0","+1"," 5", "05"]) {
    unavailable(read([record({balanceState:"observed",rawBaseUnits:raw,decimals:18})]));
  }
});
test("17 raw base units reject unbounded input", () =>
  unavailable(read([record({balanceState:"observed",rawBaseUnits:"9".repeat(81),decimals:18})])));
test("18 36 decimals are supported exactly", () => {
  const v = read([record({balanceState:"observed",rawBaseUnits:"1",decimals:36})]);
  assert.match(v.rows[0].amountLabel, new RegExp("0\\." + "0".repeat(35) + "1"));
});
test("19 decimals above 36 are disallowed until an approved token policy", () =>
  unavailable(read([record({balanceState:"observed",rawBaseUnits:"1",decimals:37})])));
test("20 decimals must be integer and nonnegative", () => {
  for (const decimals of [-1, 1.2, "18", Infinity]) {
    unavailable(read([record({balanceState:"observed",rawBaseUnits:"1",decimals})]));
  }
});
test("21 unsupported status cannot masquerade as observed", () =>
  unavailable(read([record({balanceState:"approved",rawBaseUnits:"1",decimals:18})])));
test("22 one actual chainId field triggers full rejection", () =>
  unavailable(read([record({chainId:11155111})])));
test("23 caller-supplied contractAddress field triggers rejection", () =>
  unavailable(read([record({contractAddress:"0x" + "1".repeat(40)})])));
test("24 client-supplied authorization flags trigger rejection", () =>
  unavailable(read([record({canTransfer:true})])));
test("25 legacy Points fields cannot enter token slot records", () =>
  unavailable(read([record({pointsBalance:"999.00"})])));
test("26 forged issuer/canonical supply fields trigger rejection", () =>
  unavailable(read([record({canonicalSupply:"100000000"})])));
test("27 invalid network layer rejects the whole snapshot", () =>
  unavailable(read([record({layer:"ethereum-mainnet"})])));
test("28 second invalid record removes earlier apparently valid data", () =>
  unavailable(read([record(),record({layer:"optimism"})])));
test("29 unknown asset identifiers are never interpreted as approved", () =>
  unavailable(read([record({assetKey:"RHC"})])));
test("30 asset and network partition names are strict synthetic markers", () => {
  unavailable(read([record({assetKey:"0x" + "1".repeat(40)})]));
  unavailable(read([record({assetKey:"synthetic-asset-X"})]));
});
test("31 same asset in two layers creates two independent rows", () => {
  const v = read([record(),record({layer:"synthetic-l2-a"})]);
  assert.equal(v.kind,"synthetic-review");
  assert.equal(v.rows.length,2);
  assert.notEqual(v.rows[0].key,v.rows[1].key);
  assert.equal(v.rows[0].assetKey,v.rows[1].assetKey);
});
test("32 same asset in same network is rejected as a duplicate", () =>
  unavailable(read([record(),record({movement:"synthetic_in_flight"})])));
test("33 two assets on the same network remain independent", () => {
  const v=read([record(),record({assetKey:"synthetic-asset-second"})]);
  assert.equal(v.rows.length,2);assert.notEqual(v.rows[0].key,v.rows[1].key);
});
test("34 multi-layer observed values cannot become an aggregate balance", () => {
  const v=read([
    record({balanceState:"observed",rawBaseUnits:"100",decimals:0}),
    record({layer:"synthetic-l2-a",balanceState:"observed",rawBaseUnits:"200",decimals:0}),
  ]);
  assert.equal(v.kind,"synthetic-review");assert.equal(v.combinedTotal,null);
  assert.match(v.rows[0].amountLabel,/SIMULATED 100/);
  assert.match(v.rows[1].amountLabel,/SIMULATED 200/);
  assert.equal("supply" in v,false);
});
test("35 a synthetic bridge-in-flight field never counts as redeemed/withdrawn", () => {
  const v=read([record({movement:"synthetic_in_flight"})]);
  assert.match(v.rows[0].movementLabel,/NOT a confirmed bridge/);
  assert.equal(v.combinedTotal,null);assert.equal(v.canonicalSupplyVerified,false);
});
test("36 a forged bridge proof object is rejected", () =>
  unavailable(read([record({movement:"synthetic_in_flight",bridgeProof:"accepted"})])));
test("37 applicant/user switch is rejected before any display", () =>
  unavailable(read([record({scope:scope({rhcUserId:"synthetic-user-bravo"})})])));
test("38 session-epoch switch is rejected", () =>
  unavailable(read([record({scope:scope({sessionEpoch:2})})])));
test("39 wallet link revision switch is rejected", () =>
  unavailable(read([record({scope:scope({linkRevision:"synthetic-link-other"})})])));
test("40 source revision switch is rejected", () =>
  unavailable(read([record({scope:scope({sourceRevision:"synthetic-source-other"})})])));
test("41 no data from account B is mixed into A even with another layer", () =>
  unavailable(read([record(),record({layer:"synthetic-l2-a",scope:scope({rhcUserId:"synthetic-user-bravo"})})])));
test("42 all actions remain false even when caller supplies synthetic balances", () => {
  const v=read([record({balanceState:"observed",rawBaseUnits:"1000",decimals:0})]);
  assert.equal(v.officialRhcIdentityVerified,false);
  assert.equal(v.gasModelApproved,false);
  assert.equal(v.canonicalSupplyVerified,false);
  assert.ok(Object.values(v.capabilities).every(flag => flag===false));
});
test("43 entire returned view, flags and rows are immutable", () => {
  const v=read();assert.equal(Object.isFrozen(v),true);
  assert.equal(Object.isFrozen(v.rows),true);
  assert.equal(Object.isFrozen(v.rows[0]),true);
  assert.equal(Object.isFrozen(v.capabilities),true);
});
test("44 9 slots are the maximum bounded synthetic preview", () => {
  const rows=Array.from({length:9},(_,i)=>record({
    layer:["synthetic-l1","synthetic-l2-a","synthetic-l2-b"][i%3],
    assetKey:"synthetic-asset-slot"+i,
  }));
  assert.equal(read(rows).rows.length,9);
  unavailable(read([...rows,record({assetKey:"synthetic-asset-extra"})]));
});
test("45 hostile getter values are rejected without invocation", () => {
  let reads=0;const malicious=scope();
  Object.defineProperty(malicious,"rhcUserId",{enumerable:true,get(){reads++;throw Error("unexpected getter");}});
  unavailable(read([record()],malicious));assert.equal(reads,0);
});
test("46 class instances and symbols are not accepted as scope", () => {
  class Fake { constructor(){Object.assign(this,scope());}}
  unavailable(read([record()],new Fake()));
  const x=scope(); x[Symbol("hidden")]=true; unavailable(read([record()],x));
});
test("47 UI has synthetic markers and no approved asset flag", () => {
  const html=render();
  assert.match(html,/data-w03-network-partition="synthetic-unmounted"/);
  assert.match(html,/data-rhc-asset-approved="false"/);
  assert.match(html,/role="status"/);
  assert.match(html,/SYNTHETIC OFFLINE ONLY/);
});
test("48 UI renders two distinct layers with no combined total", () => {
  const html=render([record(),record({layer:"synthetic-l2-a"})]);
  assert.match(html,/data-network-layer="synthetic-l1"/);
  assert.match(html,/data-network-layer="synthetic-l2-a"/);
  assert.match(html,/No cross-network balance total/);
});
test("49 invalid records show unavailable, not invented zero", () => {
  const html=render([record({assetKey:"official-RHC"})]);
  assert.match(html,/data-w03-network-unavailable/);
  assert.match(html,/does not establish a zero balance/);
  assert.doesNotMatch(html,/data-network-layer=/);
});
test("50 UI cannot connect, sign, request or navigate anywhere", () => {
  const html=render();
  assert.doesNotMatch(html,/<(?:button|form|input|a|script|iframe)\b/);
  assert.doesNotMatch(html,/(?:onClick|onSubmit|href=|action=)/);
  assert.match(html,/Actions disabled/);
});
test("51 render performs no fetch, provider SDK or browser storage access", () => {
  const oldFetch=globalThis.fetch;
  globalThis.fetch=()=>{throw Error("FORBIDDEN_NETWORK");};
  try{assert.match(render(),/Offline simulation only/);}
  finally{globalThis.fetch=oldFetch;}
});
test("52 code surface imports only existing offline pure model / React, no live adapters", () => {
  const ts=fs.readFileSync(new URL("./partition.ts",import.meta.url),"utf8");
  const ui=fs.readFileSync(new URL("./OfflineNetworkPartitionPreview.tsx",import.meta.url),"utf8");
  assert.match(ts,/import \{ formatTokenBaseUnits \} from "\.\.\/w03-offline-view\/model"/);
  assert.doesNotMatch(ts,/^import.*(?:thirdweb\/|packages\/web3|@rhc\/|\.\/transport)/m);
  assert.doesNotMatch(ui,/^import.*(?:thirdweb\/|packages\/web3|@rhc\/)/m);
  assert.doesNotMatch(ui,/useEffect\(|useState\(|fetch\(/);
});

test("53 revoked scope proxies fail closed instead of throwing", () => {
  const { proxy, revoke } = Proxy.revocable(scope(), {});
  revoke();
  assert.doesNotThrow(() => unavailable(read([record()], proxy)));
});
test("54 revoked arrays fail closed instead of throwing", () => {
  const { proxy, revoke } = Proxy.revocable([record()], {});
  revoke();
  assert.doesNotThrow(() => unavailable(read(proxy)));
});
test("55 hostile iterable/getter records fail closed without side effects", () => {
  let accessed = 0;
  const bad = record();
  Object.defineProperty(bad, "assetKey", {
    enumerable: true, get() { accessed++; throw new Error("FORBIDDEN_GETTER"); },
  });
  assert.doesNotThrow(() => unavailable(read([bad])));
  assert.equal(accessed, 0);
});
