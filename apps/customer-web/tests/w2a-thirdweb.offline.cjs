'use strict';
const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const ROOT = 'C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-wallet-w2a-20261009';
const OLD = 'C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-frontend-web3';
const EVIDENCE = 'C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-wallet-w2a-20261009-evidence/w2a-20261009';
require(path.join(ROOT, 'apps/customer-web/tests/offline-network.cjs'));
const esbuild = require(require.resolve('esbuild', { paths: [OLD] }));
let policy, sdk;
const legal = () => ({
  session: 'current',
  selectedChainId: 43210,
  approvedChainIds: [43210],
  billingVerified: true,
  authBridgeApproved: true,
  walletLinkContractApproved: true,
  publicClientId: 'synthetic-public-client-id',
});
before(() => {
  for (const [name,source] of [
    ['w2a-policy.bundle.cjs', 'policy.ts'],
    ['w2a-sdk-preparation.bundle.cjs', 'sdk-preparation.ts'],
  ]) {
    const outfile = path.join(EVIDENCE, name);
    // Only external, disposable artifacts are regenerated on repeat test runs.
    esbuild.buildSync({
      entryPoints: [path.join(ROOT,'apps/customer-web/app/components/wallet-thirdweb',source)],
      outfile,bundle:true,platform:'node',format:'cjs',logLevel:'silent',
      external: ['thirdweb','thirdweb/wallets'],
    });
  }
  policy = require(path.join(EVIDENCE,'w2a-policy.bundle.cjs'));
  sdk = require(path.join(EVIDENCE,'w2a-sdk-preparation.bundle.cjs'));
});

test('W2A-01 hardcoded release lock is always offline-only', () => {
  assert.equal(policy.W2A_RELEASE_LOCK,'OFFLINE_REVIEW_ONLY');
  const gate=policy.evaluateW2AReadiness(legal());
  assert.equal(gate.stage,'OFFLINE_REVIEW_ONLY');
  assert.equal(gate.enabled,false);
  assert.equal(gate.sdkMayLoad,false);
  assert.equal(gate.walletMayConnect,false);
  assert.equal(gate.embeddedWalletMayEnroll,false);
  assert.equal(gate.backendLinkVerified,false);
  assert.equal(gate.tokenIntegrationEnabled,false);
  assert.deepEqual(gate.reasons,['RELEASE_LOCKED']);
});

test('W2A-02 absent/denied session always fails closed', () => {
  for(const session of ['absent','denied']){
    const gate=policy.evaluateW2AReadiness({...legal(),session});
    assert.equal(gate.enabled,false);
    assert.ok(gate.reasons.includes('SESSION_NOT_CURRENT'));
  }
});

test('W2A-03 missing or unsupported network has no provider activity', () => {
  for(const selectedChainId of [null,undefined,0,-1,Infinity,NaN,555]){
    const gate=policy.evaluateW2AReadiness({...legal(),selectedChainId});
    assert.equal(gate.sdkMayLoad,false);
    assert.ok(gate.reasons.includes('CHAIN_NOT_APPROVED'));
  }
});

test('W2A-04 public client configuration cannot authorize release', () => {
  for(const publicClientId of [undefined,'','  ','public-test-id']){
    const gate=policy.evaluateW2AReadiness({...legal(),publicClientId});
    assert.equal(gate.enabled,false);
    assert.equal(gate.walletMayConnect,false);
    if(!publicClientId?.trim()) assert.ok(gate.reasons.includes('PUBLIC_CLIENT_ID_NOT_CONFIGURED'));
  }
});

test('W2A-05 billing verification is a separate release gate', () => {
  const gate=policy.evaluateW2AReadiness({...legal(),billingVerified:false});
  assert.ok(gate.reasons.includes('THIRDWEB_BILLING_UNVERIFIED'));
});

test('W2A-06 backend/auth approval cannot be self-asserted into live mode', () => {
  const gate=policy.evaluateW2AReadiness({...legal(),authBridgeApproved:true,walletLinkContractApproved:true});
  assert.equal(gate.enabled,false);
  assert.equal(gate.backendLinkVerified,false);
  const denied=policy.evaluateW2AReadiness({...legal(),authBridgeApproved:false,walletLinkContractApproved:false});
  assert.ok(denied.reasons.includes('AUTH_BRIDGE_NOT_APPROVED'));
  assert.ok(denied.reasons.includes('WALLET_LINK_CONTRACT_NOT_APPROVED'));
});

test('W2A-07 gate and block reason list are immutable', () => {
  const gate=policy.evaluateW2AReadiness(legal());
  assert.equal(Object.isFrozen(gate),true);
  assert.equal(Object.isFrozen(gate.reasons),true);
  assert.throws(()=>{gate.enabled=true},TypeError);
});

test('W2A-08 SDK preparation refuses mocked loader even with all prerequisites true', async () => {
  let count=0;
  const loader=async()=>{count++;throw Error('SDK loader called despite W2A lock')};
  for(const options of [legal(),{}, {...legal(),session:'absent'},{...legal(),publicClientId:'client'}]){
    const result=await sdk.prepareThirdwebFrontend(options,loader);
    assert.equal(result.status,'blocked');
    assert.equal(result.loadedSdkModules,false);
    assert.equal(result.createdClient,false);
    assert.equal(result.enrolledWallet,false);
  }
  assert.equal(count,0);
});

test('W2A-09 default SDK loader is also skipped while locked', async () => {
  const result=await sdk.prepareThirdwebFrontend(legal());
  assert.equal(result.status,'blocked');
  assert.equal(result.loadedSdkModules,false);
});

test('W2A-10 installed Thirdweb SDK exports are 5.121.6, not a fabricated adapter API', () => {
  const dep=JSON.parse(fs.readFileSync(path.join(OLD,'node_modules/thirdweb/package.json'),'utf8'));
  assert.equal(dep.version,'5.121.6');
  const tw=require(require.resolve('thirdweb',{paths:[OLD]}));
  const wallets=require(require.resolve('thirdweb/wallets',{paths:[OLD]}));
  assert.equal(typeof tw.createThirdwebClient,'function');
  assert.equal(typeof wallets.inAppWallet,'function');
  assert.equal(typeof wallets.createWallet,'function');
  // We never call these factories or wallet.connect().
});

test('W2A-11 package and lock point at the identical pinned client SDK', () => {
  const pkg=JSON.parse(fs.readFileSync(path.join(ROOT,'apps/customer-web/package.json'),'utf8'));
  const lock=JSON.parse(fs.readFileSync(path.join(ROOT,'package-lock.json'),'utf8'));
  assert.equal(pkg.dependencies.thirdweb,'5.121.6');
  assert.equal(lock.packages['apps/customer-web'].dependencies.thirdweb,'5.121.6');
  assert.equal(lock.packages['node_modules/thirdweb'].version,'5.121.6');
});

test("W2A-12 W1's accepted Git blobs remain unchanged by checkout normalization", () => {
  const cp=require('node:child_process');
  const refs=[
    'apps/customer-web/app/components/wallet-foundation/types.ts',
    'apps/customer-web/app/components/wallet-foundation/controller.ts',
    'apps/customer-web/app/components/wallet-foundation/WalletFoundation.tsx',
  ];
  const commit=cp.spawnSync('git',['-C',ROOT,'rev-parse','HEAD'],{encoding:'utf8',windowsHide:true,timeout:5000});
  assert.equal(commit.status,0);
  assert.equal(commit.stdout.trim(),'d951c91800f00d31a4ec4bd7b4da14e8a266e01d');
  const diff=cp.spawnSync('git',['-C',ROOT,'diff','--exit-code','HEAD','--',...refs],
    {encoding:'utf8',windowsHide:true,timeout:5000});
  assert.equal(diff.status,0,diff.stdout||diff.stderr);
});

test('W2A-13 no SDK, onchain action, secret or browser session side effect in mounted panel', () => {
  const file=fs.readFileSync(path.join(ROOT,'apps/customer-web/app/components/wallet-thirdweb/ThirdwebWalletReadiness.tsx'),'utf8');
  assert.doesNotMatch(file,/\bthirdweb\/wallets\b|\bfrom\s+['"]thirdweb['"]|\bfetch\s*\(|\bimport\s*\(\s*['"]thirdweb/);
  assert.doesNotMatch(file,/(?:sessionStorage|localStorage)\s*\.|\bgetSecret\b|sendTransaction\s*\(|signMessage\s*\(/);
  assert.match(file,/disabled/);
});

test('W2A-14 sdk-preparation has no wallet connection, signing or auto-connect action', () => {
  const file=fs.readFileSync(path.join(ROOT,'apps/customer-web/app/components/wallet-thirdweb/sdk-preparation.ts'),'utf8');
  const parsed=file.replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/[^\n]*/g,'');
  assert.doesNotMatch(parsed,/\.connect\s*\(|\.autoConnect\s*\(|\.sign\w*\s*\(|\.sendTransaction\s*\(/);
});

test('W2A-15 existing account route mounts only a status panel and keeps original account records', () => {
  const page=fs.readFileSync(path.join(ROOT,'apps/customer-web/app/account/page.tsx'),'utf8');
  assert.match(page,/DemoRecordsPage kind="account"/);
  assert.match(page,/<ThirdwebWalletReadiness\s*\/>/);
  const walletRoute=fs.readFileSync(path.join(ROOT,'apps/customer-web/app/wallet/page.tsx'),'utf8');
  assert.match(walletRoute,/redirect\('\/account'\)/);
});

test('W2A-16 disabled/readiness-only content does not claim live backend or token support', () => {
  const file=fs.readFileSync(path.join(ROOT,'apps/customer-web/app/components/wallet-thirdweb/ThirdwebWalletReadiness.tsx'),'utf8');
  assert.match(file,/No embedded wallet is created/);
  assert.match(file,/RHC Points balances/);
  assert.match(file,/Live Thirdweb is not enabled/);
  assert.doesNotMatch(file,/href=.*(?:wallet|thirdweb)/i);
});
