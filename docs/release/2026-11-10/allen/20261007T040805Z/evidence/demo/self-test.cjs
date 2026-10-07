'use strict';
// Pure denial/parser tests. No listener, server, browser, HTTP, DNS or store writes.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const b = require('./boundary.cjs');
assert.equal(path.basename(b.worktree), 'RHC-web3-allen-frontend-web3');
assert.equal(fs.existsSync(path.join(b.worktree, 'scripts/dev-demo.mjs')), true);
assert.deepEqual(b.listeners('TCP 127.0.0.1:3002 0.0.0.0:0 LISTENING 101\r\nTCP [::]:3003 [::]:0 LISTENING 202\nTCP 127.0.0.1:3002 127.0.0.1:1 ESTABLISHED 3'), [
  { address: '127.0.0.1:3002', port: 3002, pid: 101 }, { address: '[::]:3003', port: 3003, pid: 202 },
]);
for (const url of [
  'http://127.0.0.1:3002/', 'http://127.0.0.1:3003/integrations',
  'http://127.0.0.1:3002/api/demo/web3/token', 'http://127.0.0.1:3002/api/demo/admin/integrations/thirdweb',
  'http://127.0.0.1:3002/_next/image?url=%2Fimages%2Flogo.png',
]) assert.equal(b.allowedRequest(url), true, url);
for (const url of [
  'https://example.com', 'http://localhost:3002', 'http://127.0.0.1:43101/api/v1/me', 'http://127.0.0.1:5432',
  'http://127.0.0.1:3002.evil.test/', 'http://user:password@127.0.0.1:3002/',
  'http://127.0.0.1:3002/api/demo/reset', 'http://127.0.0.1:3002/api/demo/%72eset', 'http://127.0.0.1:3002/api/demo/import',
  'http://127.0.0.1:3002/api/v1/me', 'http://127.0.0.1:3002/_next/image?url=https%3A%2F%2Fexample.com%2Fa.png',
  'http://127.0.0.1:3002/_next/image?url=%2F%2Fevil.test%2Fa.png', 'http://127.0.0.1:3002/%FF',
]) assert.equal(b.allowedRequest(url), false, url);
assert.equal(b.allowedRequest('http://127.0.0.1:3002/api/demo/control', 'PATCH'), false);
assert.equal(b.allowedRequest('http://127.0.0.1:3002/api/demo/web3/token', 'POST'), false);
assert.equal(b.allowedWebSocket('ws://127.0.0.1:3002/_next/webpack-hmr'), true);
for (const url of ['ws://127.0.0.1:3002/rpc', 'ws://127.0.0.1:3004/_next/webpack-hmr', 'wss://example.com/socket', 'ws://localhost:3003/_next/webpack-hmr']) assert.equal(b.allowedWebSocket(url), false);
assert.deepEqual(b.descendants(10, [{ pid: 10, parent: 1 }, { pid: 12, parent: 11 }, { pid: 11, parent: 10 }, { pid: 13, parent: 2 }]).map(p => p.pid).sort(), [10, 11, 12]);
const matrix = JSON.parse(fs.readFileSync(path.join(__dirname, 'expected-outcomes.json'), 'utf8'));
assert.equal(matrix.cells.length, 15);
assert.equal(new Set(matrix.cells.map(c => c.journey + '/' + c.failure)).size, 15);
assert.equal(matrix.cells.every(c => c.status === 'NOT RUN'), true);
assert.equal(matrix.failureEndpoints.length, 2);
b.installGuard();
for (const target of [{ host: '127.0.0.1', port: 5432 }, { host: 'localhost', port: 3002 }, { host: 'example.com', port: 443 }, { path: 'unapproved-pipe' }]) {
  assert.throws(() => new (require('node:net').Socket)().connect(target), /DEMO_NETWORK_BLOCKED/);
}
assert.throws(() => b.assertOwned(3002, ''), /no ownership proof/);
assert.throws(() => require('node:dgram').createSocket('udp4'), /DEMO_NETWORK_BLOCKED/);
assert.throws(() => require('node:tls').connect(443, 'example.com'), /DEMO_NETWORK_BLOCKED/);
assert.throws(() => require('node:dns').resolve('example.com'), /DEMO_NETWORK_BLOCKED/);
console.log('PASS: pure parser, 15-cell matrix, exact HTTP/WS allowlist and deny-before-connect guard checks; zero network requests / launches / store writes.');
