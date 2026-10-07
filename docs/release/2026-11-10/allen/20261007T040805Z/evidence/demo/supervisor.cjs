'use strict';
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const b = require('./boundary.cjs');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const args = process.argv.slice(2);
const execute = args.includes('--execute');
const dry = args.includes('--dry-run');
const option = name => args[args.indexOf(name) + 1];
const roots = [];
const known = new Map();
let out, env, proofFile, abortReason, plan, cleanupDone = false;
const report = { started: new Date().toISOString(), status: 'NOT RUN', node: process.version, execPath: process.execPath, serversStarted: 0, requestsSent: 0, checks: [], cleanup: [] };
function save() { if (out) fs.writeFileSync(path.join(out, 'supervisor.json'), JSON.stringify(report, null, 2) + '\n'); }
function event(value) { if (out) fs.appendFileSync(path.join(out, 'processes.jsonl'), JSON.stringify({ at: new Date().toISOString(), ...value }) + '\n'); }
function check(condition, message) { report.checks.push({ message, passed: Boolean(condition) }); if (!condition) throw Error('BLOCKED: ' + message); }
function baseEnvironment(source) {
  const safe = {};
  const names = new Set(['path', 'systemroot', 'windir', 'comspec', 'pathext', 'temp', 'tmp', 'systemdrive', 'number_of_processors', 'processor_architecture']);
  for (const [key, value] of Object.entries(source)) if (names.has(key.toLowerCase())) safe[key] = value;
  return safe;
}
function makeEnvironment(source, store) {
  const home = path.join(out, 'home'); fs.mkdirSync(home);
  const temp = path.join(out, 'temp'); fs.mkdirSync(temp);
  return { ...baseEnvironment(source),
    USERPROFILE: home, HOME: home, APPDATA: home, LOCALAPPDATA: home, TEMP: temp, TMP: temp,
    CI: '1', NEXT_TELEMETRY_DISABLED: '1', DO_NOT_TRACK: '1', NODE_ENV: 'development',
    RHC_APP_PROFILE: 'demo', RHC_DEMO_MODE: '1', RHC_ENVIRONMENT: 'development', RHC_WEB3_MODE: 'disabled',
    NEXT_PUBLIC_RHC_DATA_MODE: 'demo', RHC_DEMO_STORE_DIR: store,
    NEXT_PUBLIC_RHC_DEMO_HUB_URL: 'http://127.0.0.1:3002/api/demo',
    NEXT_PUBLIC_CUSTOMER_WEB_URL: 'http://127.0.0.1:3002', NEXT_PUBLIC_ADMIN_WEB_URL: 'http://127.0.0.1:3003',
    RHC_DEMO_ALLOWED_HOSTS: '127.0.0.1:3002',
    RHC_DEMO_ALLOWED_ORIGINS: 'http://127.0.0.1:3002,http://127.0.0.1:3003',
    RHC_DEMO_CUSTOMER_EMAIL: 'demo@rhc.local', RHC_DEMO_CUSTOMER_PASSWORD: 'Demo123456!', RHC_DEMO_CUSTOMER_PERSONA: 'customer-maya',
    RHC_DEMO_ADMIN_EMAIL: 'superadmin@example.com', RHC_DEMO_ADMIN_PASSWORD: 'Demo123456!', RHC_DEMO_ADMIN_PERSONA: 'system-admin',
    NEXT_PUBLIC_API_URL: '', NEXT_PUBLIC_SUPABASE_URL: '', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: '', NEXT_PUBLIC_SUPABASE_ANON_KEY: '',
    PLAYWRIGHT_BROWSERS_PATH: source.PLAYWRIGHT_BROWSERS_PATH,
    DEMO_EXACT_NETWORK: '1', DEMO_OWNERSHIP_FILE: proofFile, DEMO_OUTPUT: out,
    DEMO_NODE_EXECUTABLE: process.execPath, DEMO_SELECTION: plan.name,
    // Parent's intercepted-run preload authorizes 43102/43103, not these demo apps.
    // This replacement installs the stronger owned-endpoint guard AND runtime audit.
    NODE_OPTIONS: '--require ' + JSON.stringify(path.join(__dirname, 'runtime-preload.cjs')),
  };
}
function spawnOwned(label, scriptArgs, cwd, port) {
  check(b.dotenvNames().length === 0, 'No real dotenv filenames immediately before ' + label);
  if (port) check(b.sockets().every(p => p.port !== port), 'Fixed port ' + port + ' free immediately before spawn');
  const fd = fs.openSync(path.join(out, label + '.log'), 'wx');
  let child;
  try { child = cp.spawn(process.execPath, scriptArgs, { cwd, env: { ...env, DEMO_CHILD_ROLE: label }, stdio: ['ignore', fd, fd], windowsHide: true, shell: false }); }
  finally { fs.closeSync(fd); }
  const root = { label, child, pid: child.pid, port, born: null };
  roots.push(root);
  child.on('error', error => { abortReason = label + ': ' + error.message; event({ label, error: error.message }); });
  child.on('exit', (code, signal) => { event({ label, pid: root.pid, exitCode: code, signal }); });
  if (!root.pid) throw Error('BLOCKED: spawn failed for ' + label);
  event({ label, pid: root.pid, cwd, executable: process.execPath, args: scriptArgs, port });
  if (port) report.serversStarted++;
  return root;
}
function inspect() {
  const all = b.processes();
  const live = new Map(all.map(p => [p.pid, p]));
  for (const root of roots) {
    const current = live.get(root.pid);
    if (!root.born && current && root.child.exitCode === null && root.child.signalCode === null) root.born = current.born;
    if (current && root.born === current.born) {
      for (const p of b.descendants(root.pid, all)) known.set(p.pid, { ...p, root: root.pid, label: root.label });
    }
  }
  const sockets = b.sockets();
  const allowed = [];
  for (const socket of sockets) {
    const root = roots.find(r => r.port === socket.port);
    const p = known.get(socket.pid);
    if (!root || !p || p.root !== root.pid || live.get(p.pid)?.born !== p.born ||
        root.child.exitCode !== null || root.child.signalCode !== null || socket.address !== `127.0.0.1:${socket.port}`) {
      throw Error('BLOCKED: foreign, orphaned or non-loopback listener; never contact/kill by port: ' + JSON.stringify(socket));
    }
    allowed.push(socket);
  }
  const proof = { at: Date.now(), listeners: allowed, roots: roots.map(r => ({ pid: r.pid, born: r.born, port: r.port })) };
  fs.writeFileSync(proofFile + '.tmp', JSON.stringify(proof)); fs.renameSync(proofFile + '.tmp', proofFile);
  event({ ownership: proof, descendants: [...known.values()] });
  return allowed;
}
function runtimeAudit(pid, role) {
  const file = path.join(out, `node-runtime-${pid}-0.jsonl`);
  if (!fs.existsSync(file)) return null;
  const instance = known.get(pid);
  const bornMs = Number(String(instance?.born).match(/\/Date\((\d+)\)\//)?.[1]);
  const audit = fs.readFileSync(file, 'utf8').trim().split(/\r?\n/).map(line => JSON.parse(line))
    .findLast(item => item.ppid === instance?.parent && Number.isFinite(bornMs) && Math.abs(item.startedAtMs - bornMs) < 2000);
  check(Boolean(audit), 'Runtime record matches current OS creation identity: ' + role + '/' + pid);
  check(audit.pid === pid && audit.version === 'v22.20.0' && audit.role === role && audit.exactOwnedGuard === true &&
    path.resolve(audit.execPath).toLowerCase() === path.resolve(process.execPath).toLowerCase(), 'Actual child runtime and exact network guard: ' + role + '/' + pid);
  return audit;
}
function checkAbort(deadline) {
  if (abortReason) throw Error(abortReason);
  if (Date.now() >= deadline) throw Error('TIMEOUT: bounded supervisor deadline');
  for (const root of roots.filter(r => r.port)) {
    if (root.child.exitCode !== null || root.child.signalCode !== null) throw Error('BLOCKED: owned server exited: ' + root.label);
  }
}
function cleanup() {
  if (cleanupDone) return;
  cleanupDone = true;
  // Root handles establish ownership. Retained descendants carry OS creation identity;
  // never kill a port owner, unrecorded PID, or a recycled PID.
  try { inspect(); } catch (error) { report.cleanup.push({ inspection: error.message }); }
  for (const root of [...roots].reverse()) {
    if (!root.pid || root.child.exitCode !== null || root.child.signalCode !== null) continue;
    try {
      const live = b.processes().find(p => p.pid === root.pid);
      if (!live || (root.born && live.born !== root.born)) continue;
      cp.execFileSync('taskkill.exe', ['/PID', String(root.pid), '/T', '/F'], { encoding: 'utf8', timeout: 10000, windowsHide: true, env });
      report.cleanup.push({ pid: root.pid, action: 'owned tree stopped' });
    } catch (error) { report.cleanup.push({ pid: root.pid, error: error.message }); }
  }
  const survivors = b.processes().filter(p => known.get(p.pid)?.born === p.born);
  const cleanupDeadline = Date.now() + 90000;
  for (const p of survivors.reverse()) {
    if (Date.now() >= cleanupDeadline) { report.cleanup.push({ error: 'Cleanup deadline exceeded; do not claim zero owned processes' }); break; }
    try {
      const live = b.processes().find(x => x.pid === p.pid);
      if (!live || live.born !== p.born) continue;
      cp.execFileSync('taskkill.exe', ['/PID', String(p.pid), '/F'], { encoding: 'utf8', timeout: 5000, windowsHide: true, env });
      report.cleanup.push({ pid: p.pid, action: 'recorded surviving descendant stopped' });
    } catch (error) { report.cleanup.push({ pid: p.pid, error: error.message }); }
  }
  try {
    const all = b.processes();
    report.remainingOwned = all.filter(p => known.get(p.pid)?.born === p.born || roots.some(r => r.pid === p.pid && (!r.born || r.born === p.born)));
    report.listenersAfterCleanup = b.sockets();
    if (report.remainingOwned.length) report.status = 'CLEANUP FAILED';
  } catch (error) { report.status = 'CLEANUP UNVERIFIED'; report.cleanup.push({ error: error.message }); }
  save();
}
async function main() {
  check(execute !== dry, 'Exactly one of --dry-run / --execute');
  const matrix = JSON.parse(fs.readFileSync(path.join(__dirname, 'expected-outcomes.json'), 'utf8'));
  plan = require('./selection.cjs').selection(args.includes('--selection') ? option('--selection') : 'full', matrix);
  report.selection = plan;
  check(process.platform === 'win32', 'Windows-only owned-tree implementation');
  check(fs.existsSync(path.join(b.worktree, 'scripts/dev-demo.mjs')), 'Resolved expected worktree');
  fs.mkdirSync(b.external, { recursive: true });
  const base = b.canonical(b.external);
  out = path.join(base, (dry ? 'prepare-' : 'attempt-') + new Date().toISOString().replace(/[:.]/g, '-') + '-' + crypto.randomBytes(3).toString('hex'));
  fs.mkdirSync(out); b.canonical(out);
  fs.copyFileSync(path.join(__dirname, 'expected-outcomes.json'), path.join(out, 'expected-outcomes.json'), fs.constants.COPYFILE_EXCL);
  fs.writeFileSync(path.join(out, 'selection.json'), JSON.stringify({ declaredAt: new Date().toISOString(), ...plan }, null, 2) + '\n', { flag: 'wx' });
  if (plan.targeted) fs.copyFileSync(path.join(__dirname, 'targeted-predeclared.json'), path.join(out, 'targeted-predeclared.json'), fs.constants.COPYFILE_EXCL);
  const helperSnapshot = path.join(out, 'helper-sources'); fs.mkdirSync(helperSnapshot);
  for (const file of fs.readdirSync(__dirname).filter(name => /\.(?:cjs|json|md)$/.test(name))) {
    fs.copyFileSync(path.join(__dirname, file), path.join(helperSnapshot, file), fs.constants.COPYFILE_EXCL);
  }
  proofFile = path.join(out, 'ownership.json');
  const store = path.join(b.canonical(out), 'store');
  report.output = out; report.store = store;
  check(!fs.existsSync(store), 'Fresh absent canonical store; hub must auto-initialize (no reset/import)');
  const self = b.processes().find(p => p.pid === process.pid);
  check(Boolean(self?.born), 'Local CIM ownership metadata includes current process creation identity');
  report.supervisorIdentity = self;
  report.dotenvNames = b.dotenvNames();
  check(report.dotenvNames.length === 0, 'No real dotenv names; contents never read');
  report.listenersBefore = b.sockets();
  check(report.listenersBefore.length === 0, 'Both fixed ports free by OS metadata; no HTTP probes');
  report.gates = { parentBuildsComplete: args.includes('--parent-builds-complete'), interceptedSuitesComplete: args.includes('--parent-intercepted-suites-complete'), node22: process.version === 'v22.20.0', runnerProvided: args.includes('--runner') };
  if (dry) {
    report.status = 'PREPARED / NOT RUN';
    report.note = 'No runner import, servers, browser, requests, store, reset or import. Launch still requires parent follow-up.';
    return;
  }
  check(Object.values(report.gates).every(Boolean), 'Parent builds AND intercepted suites complete, Node22.20.0 and sanitized parent runner required');
  const runnerPath = option('--runner');
  check(path.isAbsolute(runnerPath) && fs.lstatSync(runnerPath).isFile(), 'Explicit absolute existing runner module');
  const runner = require(runnerPath);
  check(path.resolve(runner.worktree).toLowerCase() === b.worktree.toLowerCase() && typeof runner.environment === 'function', 'Parent runner worktree and environment interface match');
  check(typeof runner.executable === 'string' && path.resolve(runner.executable).toLowerCase() === path.resolve(process.execPath).toLowerCase(), 'Supervisor uses the parent verified Node22 executable');
  const source = runner.environment('offline');
  check(typeof source.PLAYWRIGHT_BROWSERS_PATH === 'string' && fs.existsSync(source.PLAYWRIGHT_BROWSERS_PATH), 'Parent runner supplies already-installed browser cache (no download)');
  env = makeEnvironment(source, store);
  report.environmentNames = Object.keys(env).sort();
  const next = require.resolve('next/dist/bin/next', { paths: [b.worktree] });
  require.resolve('@playwright/test', { paths: [b.worktree] });
  const totalDeadline = Date.now() + 540000;
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { abortReason = signal; });
  spawnOwned('customer', [next, 'dev', '-H', '127.0.0.1', '-p', '3002'], path.join(b.worktree, 'apps/customer-web'), 3002);
  inspect();
  spawnOwned('admin', [next, 'dev', '-H', '127.0.0.1', '-p', '3003'], path.join(b.worktree, 'apps/admin-web'), 3003);
  const readyDeadline = Date.now() + 150000;
  while (true) {
    checkAbort(Math.min(readyDeadline, totalDeadline));
    const sockets = inspect();
    if ([3002, 3003].every(port => sockets.filter(s => s.port === port).length === 1)) {
      const records = sockets.map(s => runtimeAudit(s.pid, roots.find(r => r.port === s.port).label));
      const rootRecords = roots.map(r => runtimeAudit(r.pid, r.label));
      if ([...records, ...rootRecords].every(Boolean)) { report.serverRuntime = { listeners: records, roots: rootRecords }; break; }
    }
    await sleep(500);
  }
  check(b.dotenvNames().length === 0, 'No dotenv files appeared during startup');
  report.readiness = 'Owned PID trees listening on exact loopback ports. Browser performs first application navigation; no arbitrary listener probes.';
  report.requestsSent = 'Browser requests recorded individually in browser-events.jsonl; supervisor sends none';
  report.status = 'RUNNING'; save();
  const exercise = spawnOwned('exercise', [path.join(__dirname, 'exercise.cjs')], b.worktree);
  while (exercise.child.exitCode === null && exercise.child.signalCode === null) {
    checkAbort(totalDeadline); inspect(); await sleep(1000);
  }
  report.exerciseRuntime = runtimeAudit(exercise.pid, 'exercise');
  check(Boolean(report.exerciseRuntime), 'Browser-driving Node child recorded actual execPath/version');
  report.exerciseExit = exercise.child.exitCode;
  report.status = exercise.child.exitCode === 0 ? 'COMPLETE (consult per-cell results)' : 'FAILED (consult retained logs/results)';
  report.serverLogFindings = ['customer', 'admin'].flatMap(label => fs.readFileSync(path.join(out, label + '.log'), 'utf8')
    .split(/\r?\n/).filter(line => /^(?:Error|TypeError|ReferenceError|SyntaxError|RangeError):|DEMO_NETWORK_BLOCKED/.test(line)).map(line => ({ label, line })));
  if (report.serverLogFindings.length) report.status = 'FAILED (server child diagnostics retained)';
  if (exercise.child.exitCode !== 0 || report.serverLogFindings.length) process.exitCode = 1;
}
main().catch(error => {
  report.status = error.message.startsWith('BLOCKED:') ? 'BLOCKED' : 'FAILED';
  report.error = error.stack; process.exitCode = 2;
}).finally(() => {
  if (roots.length) {
    try { cleanup(); } catch (error) { report.status = 'CLEANUP UNVERIFIED'; report.cleanup.push({ error: error.stack }); process.exitCode = 3; }
  }
  report.finished = new Date().toISOString(); save();
  console.log(JSON.stringify(report, null, 2));
  if (/CLEANUP/.test(report.status)) process.exitCode = 3;
});
