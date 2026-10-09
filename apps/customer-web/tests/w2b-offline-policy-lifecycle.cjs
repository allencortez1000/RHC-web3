'use strict';
const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const ROOT = 'C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-w2b-offline-20261009';
const OLD = 'C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-frontend-web3';
const EVIDENCE = 'C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-wallet-w2a-20261009-evidence/w2b-p1-implementation-20261009';
require(path.join(ROOT, 'apps/customer-web/tests/offline-network.cjs'));
const esbuild = require(require.resolve('esbuild', { paths: [OLD] }));
let mock, policy, w2a;
const ID_A = '11111111-1111-4111-8111-111111111111';
const ID_B = '22222222-2222-4222-8222-222222222222';
const CHAIN = 43210; // Invented synthetic chain; NOT an approved network.
const ADDRESS_A = '0x' + 'a'.repeat(40);
const ADDRESS_B = '0x' + 'b'.repeat(40);
function context(userId = ID_A, sess = {}, conf = {}) {
  const environment = conf.environment ?? 'w2btest';
  return {
    session: {
      kind: 'active', rhcUserId: userId, sessionEpoch: 'session-1',
      accountStatus: 'ACTIVE', actor: 'customer', invited: true,
      privacyConsent: true,
      fixtureSubject: 'fixture:' + environment + ':' + userId,
      ...sess,
    },
    policy: {
      kind: 'w2b-p1-offline-fixture', revision: 'fixture-v1',
      simulatedEnabled: true, environment,
      expectedProject: 'fixture-project', presentedProject: 'fixture-project',
      selectedChain: CHAIN, allowedChains: [CHAIN],
      approvedOrigin: 'http://127.0.0.1:43102',
      browserOrigin: 'http://127.0.0.1:43102',
      publicClientId: 'fixtureclient1234',
      mode: 'synthetic-embedded',
      allowedModes: ['synthetic-embedded', 'synthetic-external'],
      simulatedBillingReady: true, simulatedAuthContractReady: true,
      consentVersion: 'test-consent-v1', ticket: 'test-accepted',
      ...conf,
    },
  };
}
function deferred() {
  let resolve; let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const tick = () => new Promise(resolve => setImmediate(resolve));
function handle(id, address = ADDRESS_A, chainId = CHAIN, mode = 'synthetic-embedded') {
  return { handleId: 'fixture:' + id, address, chainId, mode };
}
function fake(openImpl, releaseImpl) {
  let next = 0;
  const calls = { open: [], release: [] };
  const driver = {
    kind: 'rhc-w2b-p1-mock-driver',
    calls,
    openFixture(opts) {
      calls.open.push(opts);
      return Promise.resolve(openImpl ? openImpl(opts, calls) :
        handle('h' + ++next, ADDRESS_A, opts.chainId, opts.mode));
    },
    releaseFixture(opts) {
      calls.release.push(opts.handleId);
      return Promise.resolve(releaseImpl ? releaseImpl(opts, calls) : undefined);
    },
  };
  return driver;
}
const ctr = (driver = fake(), c = context(), timeout = 140) =>
  new mock.W2BOfflineController(driver, c, timeout);
const snapshot = c => c.getSnapshot();
const status = c => snapshot(c).walletStatus;
const passThroughTestId = /^fixture:[a-zA-Z0-9:_-]+$/;

before(() => {
  const inputs = [
    ['w2b-controller.bundle.cjs', 'w2b-offline/controller.ts'],
    ['w2b-policy.bundle.cjs', 'w2b-offline/mock-policy.ts'],
    ['w2b-w2a-gate.bundle.cjs', 'sdk-preparation.ts'],
  ];
  for (const [filename, source] of inputs) {
    esbuild.buildSync({
      entryPoints: [path.join(ROOT, 'apps/customer-web/app/components/wallet-thirdweb', source)],
      bundle: true, platform: 'node', format: 'cjs', logLevel: 'silent',
      external: ['thirdweb', 'thirdweb/wallets'],
      outfile: path.join(EVIDENCE, filename),
    });
  }
  mock = require(path.join(EVIDENCE, 'w2b-controller.bundle.cjs'));
  policy = require(path.join(EVIDENCE, 'w2b-policy.bundle.cjs'));
  w2a = require(path.join(EVIDENCE, 'w2b-w2a-gate.bundle.cjs'));
});

test('OFF-01 W2A release lock remains disabled with empty configuration', async () => {
  const gate = policy.evaluateSyntheticReadiness(context(ID_A, {}, { simulatedEnabled: false }));
  assert.equal(gate.releaseLock, 'OFFLINE_REVIEW_ONLY');
  assert.equal(gate.sdkMayLoad, false);
  assert.equal(gate.mayEnrollRealWallet, false);
  assert.equal(gate.canRunSyntheticFixture, false);
  const c = ctr(fake(), context(ID_A, {}, { simulatedEnabled: false }));
  assert.equal(await c.connectMock(), false);
  c.dispose();
});

test('OFF-02 forged approval booleans can never enable real Thirdweb', async () => {
  const gate = policy.evaluateSyntheticReadiness(context());
  assert.equal(gate.canRunSyntheticFixture, true);
  for (const key of ['sdkMayLoad','mayEnrollRealWallet','maySign','mayTransact','mayWriteBackendLink']) {
    assert.equal(gate[key], false);
  }
  const stub = async () => { throw Error('unexpected SDK loader'); };
  const x = await w2a.prepareThirdwebFrontend({
    session:'current',publicClientId:'example-public-id',selectedChainId:CHAIN,
    approvedChainIds:[CHAIN],billingVerified:true,authBridgeApproved:true,walletLinkContractApproved:true,
  }, stub);
  assert.equal(x.loadedSdkModules, false);
});

test('OFF-03 missing RHC session never invokes fake driver', async () => {
  const f = fake();
  const c = ctr(f,{ ...context(), session: {kind:'absent'} });
  assert.equal(status(c),'unavailable');
  assert.equal(await c.connectMock(),false);
  assert.equal(f.calls.open.length,0);
  c.dispose();
});

test('OFF-04 pending, disabled and locked RHC fixtures refuse simulation', async () => {
  for(const accountStatus of ['PENDING','LOCKED','DISABLED']){
    const f = fake(), c=ctr(f,context(ID_A,{accountStatus}));
    assert.equal(await c.connectMock(),false);
    assert.equal(f.calls.open.length,0);
    assert.ok(snapshot(c).reasons.includes('RHC_ACCOUNT_INELIGIBLE'));
    c.dispose();
  }
});

test('OFF-05 staff or admin fixtures cannot become customer wallet context', async () => {
  for(const actor of ['staff','admin']){
    const f = fake(),c=ctr(f,context(ID_A,{actor}));
    assert.equal(await c.connectMock(),false);
    assert.ok(snapshot(c).reasons.includes('RHC_ACTOR_DENIED'));
    assert.equal(f.calls.open.length,0);
    c.dispose();
  }
});

test('OFF-06 malformed RHC identity and forged subject cannot grant mock authority', async () => {
  const scenarios = [
    context('not-a-uuid'),
    context(ID_A,{fixtureSubject:'fixture:wrong:' + ID_A}),
    context(ID_A,{sessionEpoch:''}),
    context(ID_A,{sessionEpoch:'invalid epoch!'}),
  ];
  for(const input of scenarios){
    const f=fake(),c=ctr(f,input);
    assert.equal(await c.connectMock(),false);
    assert.ok(snapshot(c).reasons.includes('UNTRUSTED_FIXTURE_IDENTITY'));
    assert.equal(snapshot(c).rhcIdentityVerified,false);
    c.dispose();
  }
});

test('OFF-07 no synthetic chain selected refuses adapter', async () => {
  const f=fake(),c=ctr(f,context(ID_A,{}, {selectedChain:null}));
  assert.equal(await c.connectMock(),false);
  assert.ok(snapshot(c).reasons.includes('CHAIN_NOT_ALLOWED'));
  assert.equal(f.calls.open.length,0);
  c.dispose();
});

test('OFF-08 unsupported, malformed and mismatched chain IDs refuse', async () => {
  for(const selectedChain of [0,-1,CHAIN+1,Infinity,NaN]){
    const f=fake(),c=ctr(f,context(ID_A,{}, {selectedChain}));
    assert.equal(await c.connectMock(),false);
    assert.equal(f.calls.open.length,0);
    c.dispose();
  }
});

test('OFF-09 chain changes during connect discard late result',async()=>{
  const pending=deferred(),f=fake(()=>pending.promise),c=ctr(f);
  const run=c.connectMock();
  await tick();
  c.setContext(context(ID_A,{}, {selectedChain:CHAIN+1}));
  pending.resolve(handle('stale-chain'));
  assert.equal(await run,false);
  await tick();
  assert.equal(snapshot(c).walletAddress,null);
  assert.equal(status(c),'unavailable');
  assert.deepEqual(f.calls.release,['fixture:stale-chain']);
  c.dispose();
});

test('OFF-10 invalid, absent or secret-like public client ID blocks synthetic use',async()=>{
  for(const publicClientId of [null,'','short','sk_fauxsecret','sb_secret_12345','has spaces']){
    const f=fake(),c=ctr(f,context(ID_A,{}, {publicClientId}));
    assert.equal(await c.connectMock(),false);
    assert.ok(snapshot(c).reasons.includes('INVALID_PUBLIC_CLIENT'));
    assert.equal(f.calls.open.length,0);
    c.dispose();
  }
});

test('OFF-11 wrong synthetic project refuses operation',async()=>{
  const f=fake(),c=ctr(f,context(ID_A,{}, {presentedProject:'other-project'}));
  assert.equal(await c.connectMock(),false);
  assert.ok(snapshot(c).reasons.includes('PROJECT_MISMATCH'));
  assert.equal(f.calls.open.length,0);
  c.dispose();
});

test('OFF-12 secret-like extra config cannot leak into snapshot or scope',()=>{
  const c=ctr(fake(),context(ID_A,{}, {secretKey:'FAKE_SECRET_SHOULD_STAY_OUT',jwt:'jwt-test-token'}));
  assert.doesNotMatch(JSON.stringify(snapshot(c)),/FAKE_SECRET_SHOULD_STAY_OUT|jwt-test-token/);
  assert.equal(snapshot(c).sdkLoaded,false);
  c.dispose();
});

test('OFF-13 W2A SDK loader is unreachable under release lock',async()=>{
  let loads=0;
  await w2a.prepareThirdwebFrontend({session:'current',publicClientId:'fixture123456',selectedChainId:CHAIN,approvedChainIds:[CHAIN],billingVerified:true,authBridgeApproved:true,walletLinkContractApproved:true},async()=>{loads++;return {}});
  assert.equal(loads,0);
});

test('OFF-14 thrown SDK loader cannot be reached by forged readiness',async()=>{
  const p=await w2a.prepareThirdwebFrontend({session:'current',publicClientId:'fixture123456',selectedChainId:CHAIN,approvedChainIds:[CHAIN],billingVerified:true,authBridgeApproved:true,walletLinkContractApproved:true},()=>{throw Error('should never run');});
  assert.equal(p.status,'blocked');
});

test('OFF-15 guest wallet method cannot be enabled',async()=>{
  const f=fake(),c=ctr(f,context(ID_A,{}, {mode:'guest'}));
  assert.equal(await c.connectMock(),false);
  assert.ok(snapshot(c).reasons.includes('WALLET_MODE_DENIED'));
  c.dispose();
});

test('OFF-16 public email and social methods cannot be enabled',async()=>{
  for(const mode of ['email','google','social','oauth','passkey']){
    const c=ctr(fake(),context(ID_A,{}, {mode}));
    assert.equal(await c.connectMock(),false);
    c.dispose();
  }
});

test('OFF-17 forged redirect and OAuth state never creates RHC authority',async()=>{
  const c=ctr(fake(),{...context(),oauthRedirect:'fake',rhcRoles:['admin']});
  await c.connectMock();
  assert.equal(snapshot(c).rhcIdentityVerified,false);
  assert.equal(snapshot(c).backendLinkVerified,false);
  assert.equal('roles' in snapshot(c),false);
  assert.equal('oauthRedirect' in snapshot(c),false);
  c.dispose();
});

test('OFF-18 controller exports no real wallet recovery or token exchange method',()=>{
  const c=ctr();
  for(const name of ['recoverWallet','createWallet','linkRhcAccount','getJwt','exchangeToken','signMessage']){
    assert.equal(name in c,false);
  }
  c.dispose();
});

test('OFF-19 offline driver rejection is fail-closed and supports bounded retry',async()=>{
  let n=0;
  const c=ctr(fake(()=>++n===1?Promise.reject(Error('test provider outage')):handle('recovered-fixture')));
  assert.equal(await c.connectMock(),false);
  assert.equal(snapshot(c).failure,'MOCK_CONNECT_REJECTED');
  assert.equal(snapshot(c).walletAddress,null);
  assert.equal(await c.connectMock(),true);
  assert.equal(status(c),'connected');
  c.dispose();
});

test('OFF-20 logout during outstanding connect discards and releases late handle',async()=>{
  const pending=deferred(),f=fake(()=>pending.promise),c=ctr(f);
  const run=c.connectMock();await tick();
  c.setContext({...context(),session:{kind:'absent'}});
  pending.resolve(handle('after-logout'));
  assert.equal(await run,false);
  await tick();
  assert.equal(snapshot(c).walletAddress,null);
  assert.equal(status(c),'unavailable');
  assert.deepEqual(f.calls.release,['fixture:after-logout']);
  c.dispose();
});

test('OFF-21 RHC A to B switch hides A and does not grant B A wallet',async()=>{
  const f=fake(),c=ctr(f,context(ID_A));
  assert.equal(await c.connectMock(),true);
  const old=c.fixtureHandleIdForTests();
  c.setContext(context(ID_B));
  assert.equal(snapshot(c).rhcUserId,ID_B);
  assert.equal(snapshot(c).walletAddress,null);
  assert.equal(snapshot(c).mockLinkObservation,'unknown');
  await tick();
  assert.deepEqual(f.calls.release,[old]);
  c.dispose();
});

test('OFF-22 stale release cannot close newer mock handle',async()=>{
  const pending=deferred();
  let n=0;
  const f=fake(()=>handle(++n===1?'old':'new',n===1?ADDRESS_A:ADDRESS_B),
    ({handleId})=>handleId==='fixture:old'?pending.promise:undefined);
  const c=ctr(f);
  await c.connectMock();
  c.setContext(context(ID_B));
  assert.equal(await c.connectMock(),true);
  pending.resolve();
  await tick();
  assert.equal(snapshot(c).walletAddress,ADDRESS_B);
  assert.ok(!f.calls.release.includes('fixture:new'));
  c.dispose();
});

test('OFF-23 duplicate requests while mock connect pending are ignored',async()=>{
  const pending=deferred(),f=fake(()=>pending.promise),c=ctr(f);
  const one=c.connectMock();await tick();
  assert.equal(await c.connectMock(),false);
  pending.resolve(handle('once'));
  assert.equal(await one,true);
  assert.equal(await c.connectMock(),false);
  assert.equal(f.calls.open.length,1);
  c.dispose();
});

test('OFF-24 mocked disconnect rejection and timeout are distinct, address clears first',async()=>{
  {
    const c=ctr(fake(undefined,()=>{throw Error('mock cleanup failed')}));
    await c.connectMock();
    const op=c.disconnectMock();
    assert.equal(snapshot(c).walletAddress,null);
    assert.equal(await op,false);
    assert.equal(snapshot(c).failure,'MOCK_DISCONNECT_REJECTED');
    c.dispose();
  }
  {
    const gate=deferred(),c=ctr(fake(undefined,()=>gate.promise),context(),55);
    await c.connectMock();
    const op=c.disconnectMock();
    assert.equal(snapshot(c).walletAddress,null);
    assert.equal(await op,false);
    assert.equal(snapshot(c).failure,'MOCK_DISCONNECT_TIMEOUT');
    gate.resolve();await tick();
    assert.equal(snapshot(c).walletAddress,null);
    c.dispose();
  }
});

test('OFF-25 disconnect/reconnect uses a distinct mock handle, no automatic reuse',async()=>{
  let n=0;
  const f=fake(()=>handle('session'+ ++n));
  const c=ctr(f);
  await c.connectMock();
  const old=c.fixtureHandleIdForTests();
  assert.equal(await c.disconnectMock(),true);
  assert.equal(status(c),'disconnected');
  assert.equal(await c.connectMock(),true);
  assert.notEqual(c.fixtureHandleIdForTests(),old);
  assert.equal(f.calls.open.length,2);
  c.dispose();
});

test('OFF-26 connected mock address never counts as backend wallet link',async()=>{
  const c=ctr();await c.connectMock();
  assert.equal(snapshot(c).mockLinkObservation,'unknown');
  assert.equal(snapshot(c).backendLinkVerified,false);
  assert.equal(snapshot(c).rhcIdentityVerified,false);
  c.dispose();
});

test('OFF-27 simulated unknown versus unlinked are distinct and unauthoritative',async()=>{
  const c=ctr();await c.connectMock();
  const id=c.fixtureHandleIdForTests();
  assert.equal(snapshot(c).mockLinkObservation,'unknown');
  assert.equal(c.observeMockLink('unlinked',id),true);
  assert.equal(snapshot(c).mockLinkObservation,'unlinked');
  assert.equal(c.observeMockLink('unknown',id),true);
  assert.equal(snapshot(c).mockLinkObservation,'unknown');
  assert.equal(snapshot(c).backendLinkVerified,false);
  c.dispose();
});

test('OFF-28 synthetic revoked/conflict views never authorize a wallet',async()=>{
  const c=ctr();await c.connectMock();
  const id=c.fixtureHandleIdForTests();
  for(const link of ['pending','linked','revoked','conflict']){
    assert.equal(c.observeMockLink(link,id),true);
    assert.equal(snapshot(c).backendLinkVerified,false);
    assert.equal(snapshot(c).signingEnabled,false);
  }
  assert.equal(c.observeMockLink('linked','fixture:foreign'),false);
  c.dispose();
});

test('OFF-29 injected RHC roles/customer ID cannot grant privileges',async()=>{
  const input=context();
  input.session.roles=['OWNER','ADMIN'];
  input.policy.customerId=ID_B;
  const c=ctr(fake(),input);
  await c.connectMock();
  assert.equal(snapshot(c).backendLinkVerified,false);
  assert.equal(snapshot(c).rhcIdentityVerified,false);
  assert.equal('roles' in snapshot(c),false);
  assert.equal('customerId' in snapshot(c),false);
  c.dispose();
});

test('OFF-30 synthetic provider JWT cannot become RHC API bearer credential',async()=>{
  const input=context();
  input.session.thirdwebJwt='FAKE_PROVIDER_JWT_MUST_NOT_BE_AUTH';
  const c=ctr(fake(),input);
  await c.connectMock();
  assert.equal(snapshot(c).rhcIdentityVerified,false);
  assert.equal('jwt' in snapshot(c),false);
  assert.doesNotMatch(JSON.stringify(snapshot(c)),/FAKE_PROVIDER_JWT_MUST_NOT_BE_AUTH/);
  c.dispose();
});

test('OFF-31 RHC Points and token balances never appear from mock wallet address',async()=>{
  const c=ctr();await c.connectMock();
  assert.equal(snapshot(c).pointsBalance,'not_configured');
  assert.equal(snapshot(c).blockchainToken,'not_configured');
  assert.equal(snapshot(c).transactionsEnabled,false);
  c.dispose();
});

test('OFF-32 synthetic controller performs no browser persistence or autoConnect',()=>{
  const source=fs.readFileSync(path.join(ROOT,'apps/customer-web/app/components/wallet-thirdweb/w2b-offline/controller.ts'),'utf8');
  assert.doesNotMatch(source,/\blocalStorage\s*\.|\bsessionStorage\s*\.|\.autoConnect\s*\(|\.connect\s*\(/);
  const c=ctr();
  assert.equal(status(c),'disconnected');
  c.dispose();
});

test('OFF-33 existing Node offline network guard denies non-loopback egress',()=>{
  const net=require('node:net');
  const socket=new net.Socket();
  try{
    assert.throws(()=>socket.connect({port:443,host:'example.invalid'}),/FRONTEND_OFFLINE/);
  }finally{socket.destroy();}
});

test('OFF-34 CORS/origin mismatch simulation fails without relaxation',async()=>{
  for(const browserOrigin of ['http://127.0.0.1:3002','http://localhost:43102','https://evil.invalid']){
    const f=fake(),c=ctr(f,context(ID_A,{}, {browserOrigin}));
    assert.equal(await c.connectMock(),false);
    assert.ok(snapshot(c).reasons.includes('ORIGIN_MISMATCH'));
    assert.equal(f.calls.open.length,0);
    c.dispose();
  }
});

test('OFF-35 expired/missing/forged fixture ticket never reaches fake adapter',async()=>{
  for(const ticket of ['expired','missing','forged']){
    const f=fake(),c=ctr(f,context(ID_A,{}, {ticket}));
    assert.equal(await c.connectMock(),false);
    assert.ok(snapshot(c).reasons.includes('TICKET_FIXTURE_REJECTED'));
    assert.equal(f.calls.open.length,0);
    c.dispose();
  }
});

test('OFF-36 provider rejection text never leaks secret into snapshot',async()=>{
  const privateMarker='FAKE_SECRET_MUST_BE_REDACTED';
  const c=ctr(fake(()=>Promise.reject(Error(privateMarker))));
  await c.connectMock();
  assert.equal(snapshot(c).failure,'MOCK_CONNECT_REJECTED');
  assert.doesNotMatch(JSON.stringify(snapshot(c)),new RegExp(privateMarker));
  c.dispose();
});

test('OFF-45 mock controller offers no signing or transaction action',async()=>{
  const f=fake();
  f.sendTransaction=()=>{throw Error('never allowed')};
  f.signMessage=()=>{throw Error('never allowed')};
  const c=ctr(f);await c.connectMock();
  for(const name of ['sendTransaction','signMessage','mintToken','grantReward','sponsorGas']){
    assert.equal(name in c,false);
  }
  assert.equal(snapshot(c).signingEnabled,false);
  assert.equal(snapshot(c).transactionsEnabled,false);
  c.dispose();
});

test('OFF-46 simulated EIP-1271 link cannot verify ownership',async()=>{
  const c=ctr();
  await c.connectMock();
  assert.equal(c.observeMockLink('linked',c.fixtureHandleIdForTests()),true);
  assert.equal(snapshot(c).backendLinkVerified,false);
  assert.equal(snapshot(c).rhcIdentityVerified,false);
  c.dispose();
});

test('OFF-47 mock billing unready prevents local fake calls',async()=>{
  const f=fake(),c=ctr(f,context(ID_A,{}, {simulatedBillingReady:false}));
  assert.equal(await c.connectMock(),false);
  assert.ok(snapshot(c).reasons.includes('BILLING_FIXTURE_UNAVAILABLE'));
  assert.equal(f.calls.open.length,0);
  c.dispose();
});

test('OFF-48 unauthorized provider methods are denied by exact allowlist',async()=>{
  for(const mode of ['backend','wallet','passkey','guest','social','google','email']){
    const c=ctr(fake(),context(ID_A,{}, {mode,allowedModes:[]}));
    assert.equal(await c.connectMock(),false);
    assert.ok(snapshot(c).reasons.includes('WALLET_MODE_DENIED'));
    c.dispose();
  }
});

test('OFF-49 fixture subject changes across environment and invalidates old connection',async()=>{
  const f=fake(),c=ctr(f);
  await c.connectMock();
  c.setContext(context(ID_A,{}, {environment:'another'}));
  assert.equal(snapshot(c).walletAddress,null);
  assert.equal(snapshot(c).mockLinkObservation,'unknown');
  assert.equal(snapshot(c).backendLinkVerified,false);
  c.dispose();
});

test('OFF-50 withdrawn synthetic privacy consent clears and blocks mock wallet',async()=>{
  const f=fake(),c=ctr(f);
  await c.connectMock();
  c.setContext(context(ID_A,{privacyConsent:false}));
  assert.equal(snapshot(c).walletStatus,'unavailable');
  assert.equal(snapshot(c).walletAddress,null);
  assert.ok(snapshot(c).reasons.includes('MISSING_CONSENT'));
  assert.equal(await c.connectMock(),false);
  c.dispose();
});

test('EXTRA-SDK-PRESERVATION SDK pinned type package but never dynamically loaded by mock controller',()=>{
  const pkg=JSON.parse(fs.readFileSync(path.join(ROOT,'apps/customer-web/package.json'),'utf8'));
  assert.equal(pkg.dependencies.thirdweb,'5.121.6');
  const components=['controller.ts','mock-policy.ts','types.ts','OfflineWalletLab.tsx'];
  for(const file of components){
    const contents=fs.readFileSync(path.join(ROOT,'apps/customer-web/app/components/wallet-thirdweb/w2b-offline',file),'utf8');
    assert.doesNotMatch(contents,/\bfrom\s*['"]thirdweb(?:\/[^'"]+)?['"]|import\s*\(\s*['"]thirdweb/);
  }
});

test('EXTRA-HANDLE-VALIDATION invalid, reused or wrong-chain mock handles are rejected',async()=>{
  {
    const c=ctr(fake(()=>handle('invalid','not-hex')));
    assert.equal(await c.connectMock(),false);
    assert.equal(snapshot(c).failure,'MOCK_HANDLE_INVALID');
    c.dispose();
  }
  {
    const c=ctr(fake(()=>handle('wrong-chain',ADDRESS_A,CHAIN+1)));
    assert.equal(await c.connectMock(),false);
    assert.equal(snapshot(c).failure,'MOCK_HANDLE_INVALID');
    c.dispose();
  }
  {
    const f=fake(()=>handle('reuse'));
    const c=ctr(f);
    assert.equal(await c.connectMock(),true);
    await c.disconnectMock();
    assert.equal(await c.connectMock(),false);
    assert.equal(snapshot(c).failure,'MOCK_HANDLE_INVALID');
    c.dispose();
  }
});

test('EXTRA-DISPOSE pending connect cannot resurrect a mock wallet',async()=>{
  const wait=deferred(),f=fake(()=>wait.promise),c=ctr(f);
  const op=c.connectMock();await tick();
  c.dispose();
  wait.resolve(handle('disposed'));
  assert.equal(await op,false);
  await tick();
  assert.equal(snapshot(c).walletAddress,null);
  assert.equal(snapshot(c).walletStatus,'unavailable');
  assert.deepEqual(f.calls.release,['fixture:disposed']);
});

test('EXTRA-SCOPE canonical policy ordering avoids accidental churn',()=>{
  const a=context();
  const c=ctr(fake(),a);
  const first=snapshot(c).revision;
  const clone=context(ID_A,{}, {allowedChains:[CHAIN,CHAIN],allowedModes:['synthetic-external','synthetic-embedded']});
  c.setContext(clone);
  assert.equal(snapshot(c).revision,first);
  c.dispose();
});

test('EXTRA-LINK-STATUS mock observations scoped to current fixture handle only',async()=>{
  const c=ctr();
  assert.equal(c.observeMockLink('linked','fixture:foreign'),false);
  await c.connectMock();
  assert.equal(c.observeMockLink('linked','fixture:foreign'),false);
  assert.equal(c.observeMockLink('linked',c.fixtureHandleIdForTests()),true);
  assert.equal(snapshot(c).backendLinkVerified,false);
  c.dispose();
});

test('EXTRA-SDK-TYPEONLY pinned Thirdweb v5 shape compiles away without imports',()=>{
  const file=path.join(ROOT,'apps/customer-web/app/components/wallet-thirdweb/w2b-offline/sdk-types.ts');
  const source=fs.readFileSync(file,'utf8');
  assert.match(source,/import type \{ ThirdwebClient \} from 'thirdweb'/);
  assert.match(source,/import type \{ Account, Wallet \} from 'thirdweb\/wallets'/);
  assert.doesNotMatch(source,/^\s*import (?!type\b)/m);
  const result=esbuild.transformSync(source,{loader:'ts',format:'esm',logLevel:'silent'});
  assert.doesNotMatch(result.code,/from ['"]thirdweb(?:\/wallets)?['"]/);
  assert.equal(result.code.includes('createThirdwebClient'),false);
});
