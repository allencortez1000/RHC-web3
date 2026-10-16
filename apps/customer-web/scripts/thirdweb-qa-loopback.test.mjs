import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import net from 'node:net';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const customer = path.join(root, 'apps/customer-web');
const script = JSON.parse(fs.readFileSync(path.join(customer, 'package.json'), 'utf8')).scripts;
const rootScripts = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).scripts;

test('ordinary Customer Web development binds explicitly to IPv4 loopback', () => {
  assert.equal(script.dev, 'next dev -p 3002 -H 127.0.0.1');
  assert.doesNotMatch(script.dev, /0\.0\.0\.0|::/);
});

test('previous dedicated demo launch remains loopback-bound', () => {
  assert.equal(script['dev:demo'], 'next dev -p 3002 -H 127.0.0.1');
});

test('top-level Customer Web development uses the bounded workspace script', () => {
  assert.equal(rootScripts['dev:customer'], 'npm run dev -w @rhc/customer-web');
  assert.match(rootScripts.dev, /dev:customer/);
  assert.match(rootScripts['dev:all'], /dev:customer/);
});

test('Customer production startup is unchanged by local QA hardening', () => {
  assert.equal(script.start, 'next start -p 3002');
});

test('the Next middleware gate remains narrow and fails closed', () => {
  const middleware = fs.readFileSync(path.join(customer, 'middleware.ts'), 'utf8');
  const gate = fs.readFileSync(path.join(customer, 'app/components/wallet-thirdweb/real-provider-qa/gate.ts'), 'utf8');
  assert.match(middleware, /matcher:\s*\["\/thirdweb-qa\/:path\*"\]/);
  assert.match(middleware, /status:\s*404/);
  assert.match(middleware, /no-store/);
  assert.match(gate, /NODE_ENV|nodeEnv/);
  assert.match(gate, /HOST_NOT_LOOPBACK/);
  assert.doesNotMatch(gate, /NEXT_PUBLIC_RHC_THIRDWEB_QA_CLIENT_ID/);
});

test('no wallet-service credentials are in this task script', () => {
  for (const key of ['RHC_THIRDWEB_QA_PERMISSION_REF', 'RHC_THIRDWEB_QA_CLIENT_ID']) {
    assert.doesNotMatch(script.dev, new RegExp(key));
  }
});

function httpGet(headers = {}) {
  return new Promise((resolve, reject) => {
    const request = http.get({
      hostname: '127.0.0.1', port: 3002, path: '/thirdweb-qa',
      headers: { host: '127.0.0.1:3002', ...headers }, timeout: 7000,
    }, response => {
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => resolve({
        status: response.statusCode,
        headers: response.headers,
        body: Buffer.concat(chunks).toString('utf8'),
      }));
    });
    request.once('error', reject);
    request.once('timeout', () => request.destroy(new Error('Loopback HTTP request timed out')));
  });
}

function portFree() {
  return new Promise(resolve => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.listen(3002, '127.0.0.1', () => server.close(() => resolve(true)));
  });
}

function socketAddresses() {
  if (process.platform !== 'win32') {
    throw new Error('This bounded listener check requires the expected Windows developer workstation');
  }
  const command = '$a=@(Get-NetTCPConnection -LocalPort 3002 -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty LocalAddress); ConvertTo-Json -InputObject $a -Compress';
  const p = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command], {
    encoding: 'utf8', timeout: 12000, windowsHide: true,
  });
  assert.equal(p.status, 0, 'Unable to inspect listener addresses');
  const addresses = JSON.parse(p.stdout || '[]');
  return Array.isArray(addresses) ? addresses : [addresses];
}

test('real ordinary npm dev command only listens on loopback and denies inactive QA route', { timeout: 180000 }, async () => {
  assert.equal(process.platform, 'win32', 'Do not run the Windows process-tree harness on other platforms');
  assert.equal(await portFree(), true, 'Port 3002 was already occupied: do not disturb another process');
  const unexpectedEnv = ['.env', '.env.local', '.env.development', '.env.development.local']
    .filter(name => fs.existsSync(path.join(customer, name)));
  assert.deepEqual(unexpectedEnv, [], 'Do not open a real provider environment in this synthetic-only test');

  const npm = path.join(path.dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js');
  const guard = path.join(customer, 'tests/offline-network.cjs');
  assert.ok(fs.existsSync(npm), 'Use the existing installed npm, never download a new tool');
  assert.ok(fs.existsSync(guard), 'The test requires the non-loopback socket guard');

  const env = { ...process.env };
  for (const key of Object.keys(env)) {
    if (key.startsWith('RHC_THIRDWEB_QA_') || key.startsWith('NEXT_PUBLIC_')
        || /^(DATABASE_URL|SUPABASE|JWT_|UPSTASH|REDIS_|VERCEL|NODE_OPTIONS)/.test(key)) {
      delete env[key];
    }
  }
  Object.assign(env, {
    NODE_ENV: 'development', CI: 'true', NEXT_TELEMETRY_DISABLED: '1',
    NODE_OPTIONS: '--require ' + JSON.stringify(guard),
    NEXT_PUBLIC_RHC_DATA_MODE: 'api',
    NEXT_PUBLIC_API_URL: 'http://127.0.0.1:43101/api/v1',
    NEXT_PUBLIC_SUPABASE_URL: 'https://rhc-e2e.supabase.co',
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'synthetic-public-e2e-key',
  });

  const child = spawn(process.execPath, [npm, 'run', 'dev', '-w', '@rhc/customer-web'], {
    cwd: root, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
  });
  let recent = '';
  child.stdout.on('data', value => { recent = (recent + value.toString()).slice(-5000); });
  child.stderr.on('data', value => { recent = (recent + value.toString()).slice(-5000); });
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

  try {
    const deadline = Date.now() + 135000;
    let first;
    while (Date.now() < deadline) {
      assert.equal(child.exitCode, null, 'Bounded development server exited before ready');
      try { first = await httpGet(); break; }
      catch { await wait(350); }
    }
    assert.ok(first, 'Loopback Next server did not respond within the task deadline');

    const addresses = socketAddresses();
    assert.deepEqual([...new Set(addresses)], ['127.0.0.1'],
      'The ordinary dev command must not listen on 0.0.0.0, IPv6 wildcard or LAN address');

    for (const reply of [first, await httpGet({ host: 'localhost:3002' }),
      await httpGet({ host: 'outside.example' }),
      await httpGet({ 'x-forwarded-host': '127.0.0.1:3002' })]) {
      assert.equal(reply.status, 404, 'Inactive QA route must be denied before wallet SDK rendering');
      assert.match(reply.headers['cache-control'] || '', /no-store/);
      assert.doesNotMatch(reply.body, /data-rhc-thirdweb-qa="local-real-sdk"/);
    }
    console.log('TASK8_NEGATIVE_LISTENER_PASS: bound=127.0.0.1, deniedResponses=4, providerCalls=not_permitted');
  } finally {
    // Terminate only the task-owned npm/Next process tree, never another service.
    if (child.exitCode === null && child.pid) {
      spawnSync('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], {
        windowsHide: true, encoding: 'utf8', timeout: 15000,
      });
    }
    for (let attempts = 0; attempts < 30; attempts++) {
      if (await portFree()) break;
      await wait(150);
    }
    assert.equal(await portFree(), true, 'Task-owned server did not release port 3002');
  }
});
