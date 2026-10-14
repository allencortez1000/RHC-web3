import { test } from "node:test";
import assert from "node:assert/strict";
import {
  evaluateLocalThirdwebQa as check,
  isLoopbackQaHost,
} from "./gate.ts";

const base = Object.freeze({
  nodeEnv: "development",
  vercel: undefined,
  vercelEnv: undefined,
  host: "127.0.0.1:3002",
  approvalReference: "RHC-QA-REVIEWED-LOCAL-20261013",
  clientId: "synthetic_public_id_for_static_gate_checks",
  chainId: "11155111",
  mode: "external-metamask",
});

test("default configuration always denies provider SDK activation", () => {
  assert.deepEqual(check({}),{allowed:false,reason:"NOT_LOCAL_DEVELOPMENT"});
});
for(const host of [
  "localhost","localhost:3002","127.0.0.1:3002","[::1]:3002",
  "127.0.0.1:1","localhost:65535",
]){
  test("loopback host "+host+" allowed by host predicate",()=>{
    assert.equal(isLoopbackQaHost(host),true);
  });
}
for(const host of [
  "","0.0.0.0","0.0.0.0:3002","192.168.1.100:3002","evil.example",
  "localhost.evil.example","127.0.0.1.attacker.test",
  "localhost:0","localhost:65536","localhost:3002@evil.example",
  "127.0.0.1:3002/evil","[::1]:0","127.0.0.1:abc",
  null, 3002, "127.0.0.1 :3002",
]){
  test("bad host "+String(host)+" is rejected",()=>{
    assert.equal(isLoopbackQaHost(host),false);
  });
}
for(const override of [
  {nodeEnv:"production"}, {nodeEnv:"test"},
  {nodeEnv:undefined}, {vercel:"1"}, {vercel:"true"}, {vercel:"0"}, {vercelEnv:"preview"},
  {vercelEnv:"production"},
]){
  test("production/platform guard rejects "+JSON.stringify(override),()=>{
    assert.deepEqual(check({...base,...override}),{allowed:false,reason:"NOT_LOCAL_DEVELOPMENT"});
  });
}
for(const approvalReference of [
  undefined, "", "true", "yes", "RHC-QA-ABC", "RHC-QA-unsupported space",
  "RHC-QA-LOWERcase12","RHC-QA-123456789|evil",
]){
  test("refuses unverified approval reference "+String(approvalReference),()=>{
    assert.deepEqual(check({...base,approvalReference}),{allowed:false,reason:"NO_APPROVAL_REFERENCE"});
  });
}
for(const clientId of [
  undefined, "", "x", "sk_testvalue_1234567", "secretkey_test_123456",
  "token_abcdefghijklmnop", "sb_secret_invalidkey", "with whitespace",
  "abc@example.com",
]){
  test("refuses invalid or secret-looking Client ID "+String(clientId),()=>{
    assert.deepEqual(check({...base,clientId}),{allowed:false,reason:"CLIENT_ID_MISSING_OR_INVALID"});
  });
}
for(const chainId of [
  undefined, "1", "137", "0", "11155111 ", "11155111;1", "31337",
]){
  test("only explicit Sepolia testnet 11155111 permitted, not "+String(chainId),()=>{
    assert.deepEqual(check({...base,chainId}),{allowed:false,reason:"CHAIN_NOT_EXPLICITLY_SELECTED"});
  });
}
for(const mode of [
  undefined, "", "all","real","mainnet","personal_sign","transaction","read-only",
]){
  test("refuses unapproved wallet methods "+String(mode),()=>{
    assert.deepEqual(check({...base,mode}),{allowed:false,reason:"WALLET_METHOD_NOT_APPROVED"});
  });
}
for(const mode of ["external-metamask","embedded-email","both"]){
  test("permits approved provider-only mode "+mode+" after ALL gates",()=>{
    const decision=check({...base,mode});
    assert.equal(decision.allowed,true);
    assert.equal(decision.clientId,base.clientId);
    assert.equal(decision.chainId,11155111);
    assert.equal(decision.mode,mode);
    assert.equal(decision.approvalReference,base.approvalReference);
    assert.equal(Object.isFrozen(decision),true);
  });
}
test("refuses valid-looking config on external host",()=>{
  assert.deepEqual(check({...base,host:"rhc.example.com"}),{allowed:false,reason:"HOST_NOT_LOOPBACK"});
});
