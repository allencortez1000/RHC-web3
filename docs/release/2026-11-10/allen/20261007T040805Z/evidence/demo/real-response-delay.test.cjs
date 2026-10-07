'use strict';
// In-memory test doubles ONLY. This file never starts a browser or contacts a hub.
const assert = require('node:assert/strict');
const { eligible, makeDelay } = require('./real-response-delay.cjs');
const endpoint = '/api/demo/verify/rhc-id/demo-passport-maya-7d2f0f9a';
const origin = 'http://127.0.0.1:3002';
const page = {};
const token = 'rhc_demo_' + 'a'.repeat(32);
function request(p = endpoint, headers = {}, owner = page, failure = null) {
  return { url: () => origin + p, method: () => 'GET', headers: () => headers, frame: () => ({ page: () => owner }), failure: () => failure };
}
async function run() {
  assert.equal(eligible(origin + endpoint, 'GET'), true);
  for (const [url, method] of [[origin + endpoint, 'POST'], [origin + endpoint + '?other=1', 'GET'], ['http://127.0.0.1:43102' + endpoint, 'GET'], [origin + '/api/demo/documents', 'GET'], [origin + '/api/demo/auth/session', 'GET']]) assert.equal(eligible(url, method), false);
  assert.throws(() => makeDelay({ page, paths: ['/api/demo/reset'] }), /exact permitted/);
  assert.throws(() => makeDelay({ page, paths: ['/api/demo/me'] }), /actual selected session/);
  assert.throws(() => makeDelay({ page, paths: [endpoint], holdMs: 9000 }), /bounded/);
  const privateGate = makeDelay({ page, paths: ['/api/demo/me'], token });
  assert.equal(privateGate.matches(request('/api/demo/me', { authorization: 'Demo ' + token })), true);
  assert.equal(privateGate.matches(request('/api/demo/me', { authorization: 'Demo rhc_demo_' + 'b'.repeat(32) })), false);
  assert.equal(privateGate.matches(request('/api/demo/me', { authorization: 'Demo ' + token }, {})), false);
  privateGate.release();
  assert.equal(privateGate.matches(request('/api/demo/me', { authorization: 'Demo ' + token })), false);
  for (const cancellation of [null, { errorText: 'net::ERR_ABORTED' }]) {
    const errors = []; const events = []; let fetches = 0; let fulfilled; let disposed = false;
    const body = Buffer.from('{"success":true,"data":{"testDoubleOnly":true},"meta":{"provenance":"DEMO"}}');
    const response = { status: () => 200, body: async () => body, dispose: async () => { disposed = true; } };
    const gate = makeDelay({ page, paths: [endpoint], name: 'pure-test', log: (kind, item) => events.push({ kind, item }), onError: error => errors.push(error), assertOwned: port => assert.equal(port, 3002) });
    const route = {
      request: () => request(endpoint, {}, page, cancellation),
      fetch: async options => { fetches++; assert.deepEqual(options, { maxRedirects: 0, maxRetries: 0, timeout: 7000 }); return response; },
      fulfill: async options => { fulfilled = options; },
    };
    const pending = gate.handle(route);
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(gate.entries[0].status, 'HELD'); assert.equal(fulfilled, undefined);
    gate.release(); await pending;
    assert.equal(fetches, 1);
    assert.deepEqual(Object.keys(fulfilled), ['response']); assert.equal(fulfilled.response, response);
    assert.equal(gate.entries[0].status, cancellation ? 'BROWSER_CANCELLED' : 'RELEASED_UNCHANGED');
    assert.equal(gate.entries[0].sha256.length, 64); assert.equal(disposed, true); assert.deepEqual(errors, []);
    assert.equal(events.length, 2);
  }
  const errors = [];
  const expiry = makeDelay({ page, paths: [endpoint], name: 'bounded-expiry-test', holdMs: 10, log: () => {}, onError: error => errors.push(error), assertOwned: () => {} });
  const body = Buffer.from('{"success":true,"data":{},"meta":{"provenance":"DEMO"}}');
  await expiry.handle({ request: () => request(), fetch: async () => ({ status: () => 200, body: async () => body, dispose: async () => {} }), fulfill: async () => {} });
  assert.equal(expiry.entries[0].expired, true); assert.equal(errors.length, 1); assert.match(errors[0].message, /TIMEOUT/);
  console.log('PASS: in-memory real-response gate tests: exact page/session/GET scope, no redirects/retries, one fetch, unchanged response identity/hash, cancellation accounting, bounded expiry. Zero application/network activity.');
}
run().catch(error => { console.error(error); process.exitCode = 1; });
