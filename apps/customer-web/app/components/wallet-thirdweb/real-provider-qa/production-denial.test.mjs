import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Exercises the REAL built Next.js route. Never connects or authenticates a wallet.
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../../..');
const app = path.join(repo, 'apps/customer-web');
const nextBin = path.join(repo, 'node_modules/next/dist/bin/next');
const sentinel = 'synthetic_client_id_negative_route_test_only';
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

async function reservePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const port = server.address().port;
  await new Promise((resolve, reject) => server.close(err => err ? reject(err) : resolve()));
  return port;
}
function readRoute(port, headers = {}, pathname = "/thirdweb-qa") {
  return new Promise((resolve, reject) => {
    const request = http.get({ hostname: '127.0.0.1', port, path: pathname, headers, timeout: 10000 }, response => {
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => resolve({ code: response.statusCode, headers: response.headers, body: Buffer.concat(chunks).toString('utf8') }));
    });
    request.once('error', reject);
    request.once('timeout', () => request.destroy(new Error('Local Next route timed out')));
  });
}
async function withProductionServer(negativeFixture, verify) {
  assert.ok(fs.existsSync(path.join(app, '.next/BUILD_ID')), 'Successful production build is required');
  const port = await reservePort();
  const env = { ...process.env, NODE_ENV: 'production', NEXT_TELEMETRY_DISABLED: '1' };
  for (const key of Object.keys(env)) if (key.startsWith('RHC_THIRDWEB_QA_')) delete env[key];
  if (negativeFixture) Object.assign(env, {
    // Deliberately synthetic negative-test input, NOT an approval record.
    RHC_THIRDWEB_QA_PERMISSION_REF: 'RHC-QA-NEGATIVE-TEST-ONLY',
    RHC_THIRDWEB_QA_CLIENT_ID: sentinel,
    RHC_THIRDWEB_QA_CHAIN_ID: '11155111',
    RHC_THIRDWEB_QA_WALLET_MODE: 'both',
  });
  const child = spawn(process.execPath, [nextBin, 'start', '-H', '127.0.0.1', '-p', String(port)], {
    cwd: app, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  child.stdout.on('data', value => { output = (output + value).slice(-12000); });
  child.stderr.on('data', value => { output = (output + value).slice(-12000); });
  let startupError;
  child.once('error', error => { startupError = error; });
  try {
    const deadline = Date.now() + 45000;
    let response;
    while (Date.now() < deadline) {
      if (startupError) throw startupError;
      assert.equal(child.exitCode, null, 'Task-owned Next server exited before readiness: ' + output);
      try { response = await readRoute(port); break; } catch { await pause(300); }
    }
    assert.ok(response, 'Next server did not become ready: ' + output);
    await verify(port, response);
  } finally {
    if (child.exitCode === null) child.kill('SIGTERM');
    const stopAt = Date.now() + 5000;
    while (child.exitCode === null && child.signalCode === null && Date.now() < stopAt) await pause(100);
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
  }
}
function assertDenied(result) {
  assert.equal(result.code, 404, 'Production QA URL must be a real HTTP 404');
  assert.doesNotMatch(result.body, /data-rhc-thirdweb-qa="local-real-sdk"/);
  assert.doesNotMatch(result.body, /Connect approved test wallet/);
  assert.ok(!result.body.includes(sentinel), 'Public test identifier must not appear on denied responses');
  assert.equal(result.headers.location, undefined, 'No redirect to a provider or wallet service');
  assert.match(result.headers['cache-control'] ?? '', /no-store/);
  assert.equal(result.headers['x-robots-tag'], 'noindex, nofollow');
  assert.equal(result.body, '', 'Middleware must reject before page streaming or SDK rendering');
}

test('built production QA route returns 404 with no activation configuration', { timeout: 65000 }, async () => {
  await withProductionServer(false, async (_port, response) => assertDenied(response));
});
test('production remains 404 even with syntactically complete synthetic QA configuration', { timeout: 85000 }, async () => {
  await withProductionServer(true, async (port, response) => {
    assertDenied(response);
    assertDenied(await readRoute(port, { host: 'localhost:' + port }));
    assertDenied(await readRoute(port, { host: 'not-local.example' }));
    assertDenied(await readRoute(port, { 'x-forwarded-host': '127.0.0.1:' + port, 'x-forwarded-proto': 'http' }));
    assertDenied(await readRoute(port, {}, '/thirdweb-qa/nested'));
    const home = await readRoute(port, {}, '/');
    assert.equal(home.code, 200, 'Normal customer routes are not covered by the QA middleware');
    assert.ok(home.body.length > 0, 'Normal application page still renders');
  });
});
