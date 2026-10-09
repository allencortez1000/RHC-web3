import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { WalletFoundationController, scopeFingerprint } from '../app/components/wallet-foundation/controller.ts';

const chain = 43210; // Fictional test-only policy, NOT an approved EVM network.
const addressA = '0x' + 'a'.repeat(40);
const addressB = '0x' + 'b'.repeat(40);
const synthetic = (id, address = addressA, onChain = chain) => ({ handleId: 'synthetic:' + id, address, chainId: onChain });
const valid = (id = 'A', overrides = {}) => ({
  session: { kind: 'current', rhcUserId: id },
  policy: { enabled: true, policyRevision: 'fixture-1', selectedChainId: chain, approvedChainIds: [chain], ...overrides },
});
const deferred = () => {
  let resolve; let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const nextTick = () => new Promise((resolve) => setImmediate(resolve));

function fixture(connectImpl, releaseImpl) {
  const calls = { connects: [], releases: [] };
  let n = 0;
  return {
    kind: 'synthetic-offline',
    calls,
    async connect(input) {
      calls.connects.push(input);
      return connectImpl ? connectImpl(input, calls) : synthetic('h' + (++n));
    },
    async releaseOwned(input) {
      calls.releases.push(input.handleId);
      return releaseImpl ? releaseImpl(input, calls) : undefined;
    },
  };
}
const controller = (adapter = fixture(), initial = valid(), ms = 150) => new WalletFoundationController(adapter, initial, ms);
const status = (c) => c.getSnapshot().connectionStatus;

test('W1-01 disabled mode refuses all adapter access', async () => {
  const f = fixture();
  const c = controller(f, valid('A', { enabled: false }));
  assert.equal(status(c), 'unavailable');
  assert.equal(await c.connect(), false);
  assert.equal(f.calls.connects.length, 0);
  c.dispose();
});

test('W1-02 absent/denied RHC sessions cannot connect', async () => {
  const f = fixture();
  for (const kind of ['absent', 'denied']) {
    const c = controller(f, { ...valid(), session: { kind } });
    assert.equal(await c.connect(), false);
    assert.equal(c.getSnapshot().walletAddress, null);
    c.dispose();
  }
  assert.equal(f.calls.connects.length, 0);
});

test('W1-03 synthetic successful connect never verifies a backend link', async () => {
  const c = controller();
  assert.equal(await c.connect(), true);
  assert.equal(status(c), 'connected');
  assert.equal(c.getSnapshot().walletAddress, addressA);
  assert.equal(c.getSnapshot().syntheticLinkObservation, 'unknown');
  assert.equal(c.getSnapshot().backendLinkVerified, false);
  c.dispose();
});

test('W1-04 cancellation discards late non-cancellable result and releases only its handle', async () => {
  const gate = deferred(), f = fixture(() => gate.promise), c = controller(f);
  const promise = c.connect(); await nextTick();
  assert.equal(c.cancelConnect(), true);
  assert.equal(status(c), 'disconnected');
  assert.equal(await promise, false);
  gate.resolve(synthetic('canceled')); await nextTick(); await nextTick();
  assert.deepEqual(f.calls.releases, ['synthetic:canceled']);
  assert.equal(c.getSnapshot().walletAddress, null);
  c.dispose();
});

test('W1-05 explicit synthetic rejection has safe failed/retry state', async () => {
  let n = 0;
  const f = fixture(() => ++n === 1 ? Promise.reject(new Error('synthetic failure')) : synthetic('retry'));
  const c = controller(f);
  assert.equal(await c.connect(), false);
  assert.equal(c.getSnapshot().failure, 'CONNECT_FAILED');
  assert.equal(await c.connect(), true);
  assert.equal(status(c), 'connected');
  c.dispose();
});

test('W1-06 bounded timeout, then late success cannot resurrect a wallet', async () => {
  const gate = deferred(), f = fixture(() => gate.promise), c = controller(f, valid(), 50);
  assert.equal(await c.connect(), false);
  assert.equal(c.getSnapshot().failure, 'CONNECT_TIMEOUT');
  gate.resolve(synthetic('timeout')); await nextTick(); await nextTick();
  assert.deepEqual(f.calls.releases, ['synthetic:timeout']);
  assert.equal(c.getSnapshot().walletAddress, null);
  c.dispose();
});

test('W1-07 duplicate connect during pending and connected state is refused', async () => {
  const gate = deferred(), f = fixture(() => gate.promise), c = controller(f);
  const op = c.connect(); await nextTick();
  assert.equal(await c.connect(), false);
  gate.resolve(synthetic('one'));
  assert.equal(await op, true);
  assert.equal(await c.connect(), false);
  assert.equal(f.calls.connects.length, 1);
  c.dispose();
});

test('W1-08 disconnect clears address immediately and releases exact handle', async () => {
  const f = fixture(), c = controller(f);
  await c.connect();
  const handle = c.activeSyntheticHandleId();
  const op = c.disconnect();
  assert.equal(c.getSnapshot().walletAddress, null);
  assert.equal(status(c), 'disconnecting');
  assert.equal(await op, true);
  assert.equal(status(c), 'disconnected');
  assert.deepEqual(f.calls.releases, [handle]);
  c.dispose();
});

test('W1-09 failed disconnect remains cleared and never claims release', async () => {
  const f = fixture(undefined, () => { throw Error('offline disconnect failure'); }), c = controller(f);
  await c.connect();
  assert.equal(await c.disconnect(), false);
  assert.equal(c.getSnapshot().walletAddress, null);
  assert.equal(c.getSnapshot().failure, 'DISCONNECT_FAILED');
  assert.equal(status(c), 'failed');
  c.dispose();
});

test('W1-10 logout during pending connect discards and cleans orphan', async () => {
  const gate = deferred(), f = fixture(() => gate.promise), c = controller(f);
  const op = c.connect(); await nextTick();
  c.setContext({ ...valid(), session: { kind: 'absent' } });
  assert.equal(status(c), 'unavailable');
  gate.resolve(synthetic('logout')); await op; await nextTick();
  assert.deepEqual(f.calls.releases, ['synthetic:logout']);
  assert.equal(c.getSnapshot().walletAddress, null);
  c.dispose();
});

test('W1-11 switching RHC user A to B immediately hides A and releases A', async () => {
  const f = fixture(), c = controller(f);
  await c.connect();
  const h = c.activeSyntheticHandleId();
  c.setContext(valid('B'));
  assert.equal(c.getSnapshot().rhcUserId, 'B');
  assert.equal(c.getSnapshot().walletAddress, null);
  await nextTick();
  assert.deepEqual(f.calls.releases, [h]);
  c.dispose();
});

test('W1-12 A pending result cannot overwrite B newer connection', async () => {
  const a = deferred(), f = fixture((_input, calls) => calls.connects.length === 1 ? a.promise : synthetic('new', addressB));
  const c = controller(f);
  const old = c.connect(); await nextTick();
  c.setContext(valid('B'));
  assert.equal(await c.connect(), true);
  a.resolve(synthetic('old', addressA)); await old; await nextTick();
  assert.equal(c.getSnapshot().walletAddress, addressB);
  assert.ok(f.calls.releases.includes('synthetic:old'));
  assert.ok(!f.calls.releases.includes('synthetic:new'));
  c.dispose();
});

test('W1-13 chain selection change invalidates existing wallet and backend observation', async () => {
  const c = controller(); await c.connect();
  const h = c.activeSyntheticHandleId();
  assert.equal(c.observeSyntheticLink('linked', h), true);
  c.setContext(valid('A', { selectedChainId: 777, approvedChainIds: [chain, 777] }));
  assert.equal(c.getSnapshot().walletAddress, null);
  assert.equal(c.getSnapshot().syntheticLinkObservation, 'unknown');
  c.dispose();
});

test('W1-14 unsupported chain cannot call the adapter', async () => {
  const f = fixture(), c = controller(f, valid('A', { selectedChainId: 777 }));
  assert.equal(c.getSnapshot().chainEligibility, 'unsupported');
  assert.equal(await c.connect(), false);
  assert.equal(f.calls.connects.length, 0);
  c.dispose();
});

test('W1-15 disabling policy while connected clears wallet synchronously', async () => {
  const c = controller(); await c.connect();
  c.setContext(valid('A', { enabled: false }));
  assert.equal(status(c), 'unavailable');
  assert.equal(c.getSnapshot().walletAddress, null);
  c.dispose();
});

test('W1-16 policy revision and wallet scoping are deterministic', async () => {
  const f = fixture(), c = controller(f);
  const first = c.getSnapshot().revision;
  c.setContext(valid('A', { approvedChainIds: [chain, chain] }));
  assert.equal(c.getSnapshot().revision, first); // equivalent approval set
  await c.connect();
  c.setContext(valid('A', { policyRevision: 'fixture-2' }));
  assert.equal(c.getSnapshot().walletAddress, null);
  assert.notEqual(scopeFingerprint(valid('A')), scopeFingerprint(valid('A', { policyRevision: 'fixture-2' })));
  c.dispose();
});

test('W1-17 dispose of connected controller releases own handle and closes listeners', async () => {
  const f = fixture(), c = controller(f);
  let called = 0; c.subscribe(() => called++);
  await c.connect();
  const h = c.activeSyntheticHandleId(), before = called;
  c.dispose(); await nextTick();
  assert.equal(c.getSnapshot().walletAddress, null);
  assert.ok(f.calls.releases.includes(h));
  assert.equal(c.activeSyntheticHandleId(), null);
  assert.equal(await c.connect(), false);
  assert.equal(called, before);
});

test('W1-18 dispose during a pending connection discards its eventual completion', async () => {
  const gate = deferred(), f = fixture(() => gate.promise), c = controller(f);
  const op = c.connect(); await nextTick(); c.dispose();
  gate.resolve(synthetic('disposed')); await op; await nextTick();
  assert.deepEqual(f.calls.releases, ['synthetic:disposed']);
  assert.equal(c.getSnapshot().walletAddress, null);
});

test('W1-19 old cleanup cannot disconnect a new synthetic wallet handle', async () => {
  const oldRelease = deferred(), f = fixture(
    (_input, calls) => calls.connects.length === 1 ? synthetic('first') : synthetic('second', addressB),
    ({ handleId }) => handleId === 'synthetic:first' ? oldRelease.promise : undefined,
  );
  const c = controller(f, valid(), 80);
  await c.connect();
  c.setContext(valid('B'));
  assert.equal(await c.connect(), true);
  oldRelease.resolve(); await nextTick();
  assert.equal(c.activeSyntheticHandleId(), 'synthetic:second');
  assert.equal(c.getSnapshot().walletAddress, addressB);
  assert.ok(!f.calls.releases.includes('synthetic:second'));
  c.dispose();
});

test('W1-20 link is unknown by default, not silently unlinked', async () => {
  const c = controller(); await c.connect();
  assert.equal(c.getSnapshot().syntheticLinkObservation, 'unknown');
  assert.equal(c.getSnapshot().backendLinkVerified, false);
  c.dispose();
});

test('W1-21 linked/revoked/conflict observations never grant backend authority', async () => {
  const c = controller(); await c.connect();
  const h = c.activeSyntheticHandleId();
  for (const state of ['pending', 'linked', 'revoked', 'conflict', 'unlinked']) {
    assert.equal(c.observeSyntheticLink(state, h), true);
    assert.equal(c.getSnapshot().syntheticLinkObservation, state);
    assert.equal(c.getSnapshot().backendLinkVerified, false);
  }
  c.dispose();
});

test('W1-22 forged handle, reversed connection, and token observation are refused/absent', async () => {
  const c = controller(); await c.connect();
  assert.equal(c.observeSyntheticLink('linked', 'synthetic:foreign'), false);
  assert.equal(c.getSnapshot().backendLinkVerified, false);
  assert.equal(c.getSnapshot().tokenObservation, 'not_configured');
  assert.equal(Object.hasOwn(c.getSnapshot(), 'balances'), false);
  assert.equal(Object.hasOwn(c.getSnapshot(), 'roles'), false);
  const f = fixture(() => synthetic('wrongchain', addressA, chain + 1));
  const bad = controller(f);
  assert.equal(await bad.connect(), false);
  assert.equal(bad.getSnapshot().failure, 'INVALID_HANDLE');
  bad.dispose(); c.dispose();
});

test('W1-23 static audit: no real wallet, localStorage, provider, signing, or fetch calls', () => {
  const dir = new URL('../app/components/wallet-foundation/', import.meta.url);
  for (const file of ['types.ts', 'controller.ts', 'WalletFoundation.tsx']) {
    const src = fs.readFileSync(new URL(file, dir), 'utf8');
    assert.doesNotMatch(src, /(?:from\s+['"](?:thirdweb|@rhc\/web3)|localStorage\s*\.|sessionStorage\s*\.|\bfetch\s*\(|\bXMLHttpRequest\b|\.signMessage\s*\(|\.sendTransaction\s*\()/);
  }
});

test('W1-24 deliberate synthetic wallet switch requires release then a distinct handle', async () => {
  let seq = 0;
  const f = fixture(() => synthetic('swap-' + (++seq), seq === 1 ? addressA : addressB));
  const c = controller(f);
  assert.equal(await c.connect(), true);
  const previous = c.activeSyntheticHandleId();
  assert.equal(await c.disconnect(), true);
  assert.deepEqual(f.calls.releases, [previous]);
  assert.equal(await c.connect(), true);
  assert.equal(c.getSnapshot().walletAddress, addressB);
  assert.notEqual(c.activeSyntheticHandleId(), previous);
  assert.equal(c.getSnapshot().syntheticLinkObservation, 'unknown');
  c.dispose();
});

test('W1-25 synthetic disconnect timeout reports timeout separately, hides address, and ignores late settlement', async () => {
  const pending = deferred();
  const f = fixture(undefined, () => pending.promise);
  const c = controller(f, valid(), 55);
  assert.equal(await c.connect(), true);
  assert.equal(await c.disconnect(), false);
  assert.equal(c.getSnapshot().walletAddress, null);
  assert.equal(c.getSnapshot().connectionStatus, 'failed');
  assert.equal(c.getSnapshot().failure, 'DISCONNECT_TIMEOUT');
  pending.resolve();
  await nextTick();
  assert.equal(c.getSnapshot().walletAddress, null);
  c.dispose();
});
