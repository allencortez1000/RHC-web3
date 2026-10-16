import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { isQaWalletMethodPermitted, getQaProviderView } from './provider-view.ts';

const address = '0x' + '1'.repeat(40);
const provider = patch => ({
  mode: 'both',
  connectionStatus: 'connected',
  isConnecting: false,
  walletId: 'inApp',
  address,
  chainId: 11155111,
  lastAction: 'idle',
  ...patch,
});

test('01 embedded-only explicitly permits Thirdweb inApp', () => {
  assert.equal(isQaWalletMethodPermitted('embedded-email','inApp'),true);
});
test('02 external-only explicitly permits io.metamask', () => {
  assert.equal(isQaWalletMethodPermitted('external-metamask','io.metamask'),true);
});
test('03 both mode permits the two selected SDK identities', () => {
  assert.equal(isQaWalletMethodPermitted('both','inApp'),true);
  assert.equal(isQaWalletMethodPermitted('both','io.metamask'),true);
});
test('04 email-only rejects a previously active external wallet', () => {
  assert.equal(isQaWalletMethodPermitted('embedded-email','io.metamask'),false);
});
test('05 external-only rejects a previously active email wallet', () => {
  assert.equal(isQaWalletMethodPermitted('external-metamask','inApp'),false);
});
test('06 unknown wallets cannot masquerade as QA-accepted', () => {
  for (const name of ['io.rabby','com.coinbase.wallet','inAppWallet','walletconnect','metamask','io.metamask ']) {
    assert.equal(isQaWalletMethodPermitted('both',name),false);
  }
});
test('07 absent and nonstring wallet IDs fail closed', () => {
  for (const id of [null,undefined,'',{},42,true,Symbol('inApp')]) {
    assert.equal(isQaWalletMethodPermitted('both',id),false);
  }
});
test('08 malformed or forged mode cannot approve a known wallet', () => {
  for (const mode of ['',undefined,null,'all','production','email','BOTH',{},true]) {
    assert.equal(isQaWalletMethodPermitted(mode,'inApp'),false);
    assert.equal(isQaWalletMethodPermitted(mode,'io.metamask'),false);
  }
});
test('09 email-only and observed inApp/Sepolia connection is eligible as provider QA only', () => {
  const v=getQaProviderView(provider({mode:'embedded-email'}));
  assert.equal(v.connected,true);
  assert.equal(v.qaEligible,true);
  assert.equal(v.providerIdLabel,'inApp');
  assert.equal(v.maskedAddress,'0x1111...1111');
  assert.match(v.notice,/RHC link remains UNVERIFIED/);
  assert.equal(v.canConnect,false);
  assert.equal(v.canDisconnect,true);
});
test('10 MetaMask connected during email-only mode never appears QA-approved', () => {
  const v=getQaProviderView(provider({mode:'embedded-email',walletId:'io.metamask'}));
  assert.equal(v.connected,true); // SDK connection is real but not RHC QA-authorized.
  assert.equal(v.qaEligible,false);
  assert.match(v.networkLabel,/not permitted/);
  assert.match(v.notice,/not permitted/);
  assert.equal(v.maskedAddress,'Unapproved wallet');
  assert.equal(v.canConnect,false);
  assert.equal(v.canDisconnect,true);
});
test('11 inApp connected during external-only mode never appears QA-approved', () => {
  const v=getQaProviderView(provider({mode:'external-metamask'}));
  assert.equal(v.connected,true);
  assert.equal(v.qaEligible,false);
  assert.match(v.notice,/Disconnect this wallet/);
  assert.equal(v.maskedAddress,'Unapproved wallet');
  assert.equal(v.canDisconnect,true);
});
test('12 external-only MetaMask is an eligible provider in Sepolia QA', () => {
  const v=getQaProviderView(provider({mode:'external-metamask',walletId:'io.metamask'}));
  assert.equal(v.qaEligible,true);
  assert.equal(v.providerIdLabel,'io.metamask');
  assert.equal(v.networkLabel,'selected testnet');
  assert.match(v.notice,/UNVERIFIED/);
});
test('13 both mode accepts inApp wallet without requiring browser extension', () => {
  const v=getQaProviderView(provider({mode:'both',walletId:'inApp'}));
  assert.equal(v.qaEligible,true);
  assert.equal(v.canDisconnect,true);
});
test('14 both mode accepts MetaMask as optional method', () => {
  const v=getQaProviderView(provider({mode:'both',walletId:'io.metamask'}));
  assert.equal(v.qaEligible,true);
});
test('15 unknown SDK wallet stays disconnectable but is untrusted and redacted', () => {
  const v=getQaProviderView(provider({mode:'both',walletId:'some-untrusted-provider-identity-possibly-long'}));
  assert.equal(v.connected,true);
  assert.equal(v.qaEligible,false);
  assert.equal(v.providerIdLabel,'Unapproved provider (disconnect only)');
  assert.equal(v.maskedAddress,'Unapproved wallet');
  assert.match(v.notice,/not permitted/);
  assert.equal(v.canConnect,false);
  assert.equal(v.canDisconnect,true);
});
test('16 changed Mainnet chain cannot qualify even with valid provider method', () => {
  const v=getQaProviderView(provider({mode:'embedded-email',chainId:1}));
  assert.equal(v.connected,true);
  assert.equal(v.qaEligible,false);
  assert.match(v.networkLabel,/unsupported network/);
  assert.match(v.notice,/No RHC actions/);
});
test('17 missing chain is not assumed to be Sepolia', () => {
  const v=getQaProviderView(provider({mode:'both',chainId:undefined}));
  assert.equal(v.qaEligible,false);
  assert.match(v.networkLabel,/unsupported network/);
});
test('18 string Sepolia chain is not accepted as the numeric chain ID', () => {
  assert.equal(getQaProviderView(provider({chainId:'11155111'})).qaEligible,false);
});
test('19 disconnected SDK state cannot be overridden by a stale address', () => {
  const v=getQaProviderView(provider({connectionStatus:'disconnected'}));
  assert.equal(v.connected,false);
  assert.equal(v.qaEligible,false);
  assert.equal(v.maskedAddress,'Not connected');
  assert.equal(v.canConnect,false); // stale wallet object blocks replacing it.
});
test('20 no wallet active permits only the initial connect action', () => {
  const v=getQaProviderView(provider({connectionStatus:'disconnected',walletId:undefined,address:undefined}));
  assert.equal(v.qaEligible,false);
  assert.equal(v.providerIdLabel,'None');
  assert.equal(v.canConnect,true);
  assert.equal(v.canDisconnect,false);
});
test('21 malformed account/address does not imply QA eligibility', () => {
  const v=getQaProviderView(provider({address:'<script>alert(1)</script>'}));
  assert.equal(v.connected,false);
  assert.equal(v.qaEligible,false);
  assert.equal(v.maskedAddress,'Not connected');
});
test('22 connecting action hides address and blocks both methods', () => {
  const v=getQaProviderView(provider({lastAction:'connecting'}));
  assert.equal(v.busy,true);
  assert.equal(v.qaEligible,false);
  assert.equal(v.canConnect,false);
  assert.equal(v.canDisconnect,false);
  assert.equal(v.maskedAddress,'Not connected');
});
test('23 connecting hook also blocks both actions', () => {
  const v=getQaProviderView(provider({connectionStatus:'connecting'}));
  assert.equal(v.qaEligible,false);
  assert.equal(v.canConnect,false);
  assert.equal(v.canDisconnect,false);
});
test('24 disconnect request is not a confirmed disconnect or QA eligible', () => {
  const v=getQaProviderView(provider({lastAction:'disconnect_requested'}));
  assert.equal(v.connected,true);
  assert.equal(v.qaEligible,false);
  assert.match(v.notice,/Disconnect requested; waiting/);
  assert.equal(v.canDisconnect,true); // still SDK-connected; retry is not silently forbidden.
});
test('25 disconnect failed can be retried but not count as eligible', () => {
  const v=getQaProviderView(provider({lastAction:'disconnect_failed'}));
  assert.equal(v.qaEligible,false);
  assert.match(v.notice,/could not be completed/);
  assert.equal(v.canDisconnect,true);
});
test('26 earlier canceled attempt does not override current SDK connected state', () => {
  const v=getQaProviderView(provider({lastAction:'canceled'}));
  assert.equal(v.qaEligible,true);
  assert.match(v.notice,/provider reports a connection/);
});
test('27 recent account/address swap is immediately reflected, never stale', () => {
  const v=getQaProviderView(provider({address:'0x'+'2'.repeat(40)}));
  assert.equal(v.maskedAddress,'0x2222...2222');
  assert.ok(!JSON.stringify(v).includes(address));
});
test('28 foreign chain plus foreign method is always method-ineligible', () => {
  const v=getQaProviderView(provider({mode:'external-metamask',walletId:'inApp',chainId:1}));
  assert.equal(v.qaEligible,false);
  assert.match(v.notice,/not permitted/);
});
test('29 exposed view never contains the full wallet address or a secret key', () => {
  const v=getQaProviderView(provider({mode:'both'}));
  const serialized=JSON.stringify(v);
  assert.ok(!serialized.includes(address));
  assert.ok(!serialized.includes('secretKey'));
  assert.equal(Object.isFrozen(v),true);
});
test('30 unexpected wallet method cannot enable token, signing or backend actions', () => {
  const v=getQaProviderView(provider({mode:'embedded-email',walletId:'other-wallet'}));
  assert.deepEqual(Object.keys(v).filter(k=>/^can/.test(k)).sort(),['canConnect','canDisconnect']);
  assert.equal(v.qaEligible,false);
});
test('31 UI passes approved mode into provider display, no independent public override', () => {
  const source=fs.readFileSync(new URL('./ThirdwebLocalQa.tsx',import.meta.url),'utf8');
  assert.match(source,/getQaProviderView\(\{\s*mode,/);
  assert.match(source,/data-qa-method-eligible=\{view.qaEligible/);
  assert.match(source,/data-qa-provider-id/);
  assert.match(source,/\{view.providerIdLabel\}/);
  assert.doesNotMatch(source,/\{activeWallet\?\.id \?\? "None"\}/);
});
