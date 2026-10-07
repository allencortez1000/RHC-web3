'use strict';
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const net = require('node:net');
const origins = new Set(['http://127.0.0.1:3002', 'http://127.0.0.1:3003']);
const fixturePaths = new Set(['/api/demo/web3/token', '/api/demo/admin/integrations/thirdweb']);
const worktree = path.resolve(__dirname, '../../../../../../..');
const osEnvironment = Object.fromEntries(Object.entries(process.env).filter(([key]) => ['path', 'systemroot', 'windir', 'comspec', 'pathext', 'temp', 'tmp', 'systemdrive'].includes(key.toLowerCase())));
const external = path.resolve(worktree, '../RHC-web3-allen-frontend-web3-evidence/20261007T040805Z/demo');
function listeners(text) {
  return text.split(/\r?\n/).map(line => line.trim().split(/\s+/))
    .filter(row => row[0] === 'TCP' && row[3] === 'LISTENING' && /:(3002|3003)$/.test(row[1]))
    .map(row => ({ address: row[1], port: Number(row[1].split(':').at(-1)), pid: Number(row[4]) }));
}
function sockets() {
  return listeners(cp.execFileSync('netstat.exe', ['-ano'], { encoding: 'utf8', timeout: 5000, windowsHide: true, env: osEnvironment }));
}
function processes() {
  const text = cp.execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
    'Get-CimInstance Win32_Process | Select-Object ProcessId,ParentProcessId,CreationDate | ConvertTo-Json -Compress'],
  { encoding: 'utf8', timeout: 10000, windowsHide: true, env: osEnvironment });
  const value = JSON.parse(text);
  return (Array.isArray(value) ? value : [value]).map(p => ({ pid: p.ProcessId, parent: p.ParentProcessId, born: p.CreationDate }));
}
function descendants(root, all) {
  const found = new Set([root]);
  for (let n = 0; n < all.length; n++) {
    let changed = false;
    for (const p of all) if (found.has(p.parent) && !found.has(p.pid)) { found.add(p.pid); changed = true; }
    if (!changed) break;
  }
  return all.filter(p => found.has(p.pid));
}
function dotenvNames() {
  return ['', 'apps/customer-web', 'apps/admin-web'].flatMap(dir => fs.readdirSync(path.join(worktree, dir))
    .filter(name => name.startsWith('.env') && !name.endsWith('.example')).map(name => path.join(dir, name)));
}
function canonical(directory) {
  const absolute = path.resolve(directory);
  for (let part = absolute; ; part = path.dirname(part)) {
    if (fs.lstatSync(part).isSymbolicLink()) throw Error('BLOCKED: symlink/junction ancestor: ' + part);
    if (path.dirname(part) === part) break;
  }
  return fs.realpathSync.native(absolute);
}
function allowedRequest(raw, method = 'GET') {
  let u; try { u = new URL(raw); } catch { return false; }
  if (!origins.has(u.origin) || u.username || u.password) return false;
  let p; try { p = decodeURIComponent(u.pathname); } catch { return false; }
  // Control reads are harmless; mutation/reset/import and remote image proxying are not.
  if (p.startsWith('/api/') && !p.startsWith('/api/demo/')) return false;
  if (/^\/api\/demo\/(reset|import)(\/|$)/.test(p)) return false;
  if (p === '/api/demo/control' && method !== 'GET') return false;
  if (p === '/_next/image') {
    const image = u.searchParams.get('url') || '';
    if (!image.startsWith('/') || image.startsWith('//') || image.includes('\\')) return false;
  }
  if (fixturePaths.has(p) && method !== 'GET') return false;
  return true;
}
function allowedWebSocket(raw) {
  try {
    const u = new URL(raw);
    return ['ws://127.0.0.1:3002', 'ws://127.0.0.1:3003'].includes(u.origin) &&
      u.pathname === '/_next/webpack-hmr' && !u.username && !u.password;
  } catch { return false; }
}
function assertOwned(port, proofFile = process.env.DEMO_OWNERSHIP_FILE) {
  if (!proofFile) throw Error('BLOCKED: no ownership proof');
  const proof = JSON.parse(fs.readFileSync(proofFile, 'utf8'));
  if (Date.now() - proof.at > 15000 || proof.at > Date.now()) throw Error('BLOCKED: stale ownership proof');
  const expected = proof.listeners.filter(p => p.port === Number(port));
  const actual = sockets().filter(p => p.port === Number(port));
  if (expected.length !== 1 || actual.length !== 1 || actual[0].address !== `127.0.0.1:${port}` ||
      actual[0].pid !== expected[0].pid) throw Error('BLOCKED: missing/foreign/non-loopback listener on ' + port);
  return actual[0];
}
function installGuard() {
  const key = Symbol.for('rhc.demo.exact-owned-network');
  if (net.Socket.prototype[key]) return;
  const original = net.Socket.prototype.connect;
  net.Socket.prototype.connect = function (...args) {
    const a = Array.isArray(args[0]) ? args[0] : args;
    const o = a[0] && typeof a[0] === 'object' ? a[0] : { port: a[0], host: typeof a[1] === 'string' ? a[1] : undefined };
    if (o.path || String(o.host) !== '127.0.0.1' || ![3002, 3003].includes(Number(o.port))) {
      throw Error('DEMO_NETWORK_BLOCKED: outbound socket is not an exact owned endpoint');
    }
    assertOwned(Number(o.port));
    return original.apply(this, args);
  };
  net.Socket.prototype[key] = true;
  require('node:dgram').createSocket = () => { throw Error('DEMO_NETWORK_BLOCKED: UDP'); };
  require('node:tls').connect = () => { throw Error('DEMO_NETWORK_BLOCKED: TLS'); };
  const dns = require('node:dns');
  for (const target of [dns, dns.promises]) {
    for (const name of Object.keys(target)) if (/^(resolve|reverse)/.test(name) && typeof target[name] === 'function') {
      target[name] = () => { throw Error('DEMO_NETWORK_BLOCKED: DNS'); };
    }
  }
  const lookup = dns.lookup;
  dns.lookup = function (host, ...args) {
    if (host !== '127.0.0.1') throw Error('DEMO_NETWORK_BLOCKED: hostname lookup');
    return lookup.call(this, host, ...args);
  };
  dns.promises.lookup = async host => {
    if (host !== '127.0.0.1') throw Error('DEMO_NETWORK_BLOCKED: hostname lookup');
    return { address: '127.0.0.1', family: 4 };
  };
}
module.exports = { worktree, external, origins, fixturePaths, listeners, sockets, processes, descendants, dotenvNames, canonical, allowedRequest, allowedWebSocket, assertOwned, installGuard };
if (process.env.DEMO_EXACT_NETWORK === '1') installGuard();
