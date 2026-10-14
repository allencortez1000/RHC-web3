import test from 'node:test';
import assert from 'node:assert/strict';
import { getQaProviderView } from './provider-view.ts';

// Invented addresses only. This suite calls no SDK/provider and opens no wallet.
const fixtureAddress = '0x' + '1'.repeat(40);
const connected = { connectionStatus: 'connected', isConnecting: false, walletId: 'io.metamask', address: fixtureAddress, chainId: 11155111, lastAction: 'idle' };
const disconnected = { connectionStatus: 'disconnected', isConnecting: false, lastAction: 'idle' };

test('connected display is based on observed SDK status, never an earlier success string', () => {
  const v = getQaProviderView(connected);
  assert.equal(v.connected, true);
  assert.match(v.notice, /UNVERIFIED/);
  assert.equal(v.maskedAddress, '0x1111...1111');
  assert.equal(v.canConnect, false);
  assert.equal(v.canDisconnect, true);
});
test('wallet disappearing after a connection clears its address and old connected notice', () => {
  getQaProviderView(connected);
  const v = getQaProviderView(disconnected);
  assert.equal(v.maskedAddress, 'Not connected');
  assert.match(v.notice, /No wallet connected/);
  assert.equal(v.connected, false);
  assert.equal(v.canConnect, true);
});
test('disconnect is a request while the provider still reports connected', () => {
  const v = getQaProviderView({ ...connected, lastAction: 'disconnect_requested' });
  assert.match(v.notice, /Disconnect requested; waiting/);
  assert.doesNotMatch(v.notice, /provider disconnected/);
});
test('confirmed disconnect shows no prior address', () => {
  const v = getQaProviderView({ ...disconnected, lastAction: 'disconnect_requested' });
  assert.equal(v.connected, false);
  assert.equal(v.maskedAddress, 'Not connected');
  assert.match(v.notice, /No wallet connected/);
});
test('disconnect exception does not falsely claim success', () => {
  const v = getQaProviderView({ ...connected, lastAction: 'disconnect_failed' });
  assert.match(v.notice, /could not be completed/);
  assert.equal(v.connected, true);
});
test('canceled connection cannot show a connected wallet', () => {
  const v = getQaProviderView({ ...disconnected, lastAction: 'canceled' });
  assert.match(v.notice, /canceled or unavailable/);
  assert.equal(v.canConnect, true);
  assert.equal(v.canDisconnect, false);
});
test('a previous cancellation cannot override a current observed connection', () => {
  const v = getQaProviderView({ ...connected, lastAction: 'canceled' });
  assert.match(v.notice, /reports a connection/);
  assert.doesNotMatch(v.notice, /canceled/);
});
test('connecting hides old account data and disables both operations', () => {
  const v = getQaProviderView({ ...connected, isConnecting: true });
  assert.equal(v.maskedAddress, 'Not connected');
  assert.equal(v.canConnect, false);
  assert.equal(v.canDisconnect, false);
  assert.match(v.notice, /Waiting/);
});
test('synchronous click guard hides values before hook state updates', () => {
  const v = getQaProviderView({ ...connected, lastAction: 'connecting' });
  assert.equal(v.busy, true);
  assert.equal(v.connected, false);
});
test('the SDK connecting status also blocks operations', () => {
  const v = getQaProviderView({ ...disconnected, connectionStatus: 'connecting' });
  assert.equal(v.busy, true);
  assert.equal(v.canConnect, false);
});
test('mainnet is not reported as an eligible QA chain', () => {
  const v = getQaProviderView({ ...connected, chainId: 1 });
  assert.match(v.networkLabel, /unsupported network/);
  assert.match(v.notice, /No RHC actions/);
});
test('missing chain is unavailable rather than an assumed Sepolia connection', () => {
  const v = getQaProviderView({ ...connected, chainId: undefined });
  assert.match(v.networkLabel, /unsupported network/);
});
test('a stale account object cannot override disconnected SDK status', () => {
  const v = getQaProviderView({ ...connected, connectionStatus: 'disconnected' });
  assert.equal(v.connected, false);
  assert.equal(v.maskedAddress, 'Not connected');
});
test('a malformed address is not displayed', () => {
  const v = getQaProviderView({ ...connected, address: '<script>private</script>' });
  assert.equal(v.connected, false);
  assert.equal(v.maskedAddress, 'Not connected');
  assert.match(v.notice, /incomplete/);
});
test('provider identity is required for a complete connection', () => {
  const v = getQaProviderView({ ...connected, walletId: undefined });
  assert.equal(v.connected, false);
  assert.equal(v.canDisconnect, false);
});
test('new account replaces previous masked address immediately', () => {
  const v = getQaProviderView({ ...connected, address: '0x' + '2'.repeat(40) });
  assert.equal(v.maskedAddress, '0x2222...2222');
  assert.ok(!v.maskedAddress.includes('1111'));
});
test('all returned views are immutable and contain no full address', () => {
  const v = getQaProviderView(connected);
  assert.equal(Object.isFrozen(v), true);
  assert.ok(!JSON.stringify(v).includes(fixtureAddress));
});
