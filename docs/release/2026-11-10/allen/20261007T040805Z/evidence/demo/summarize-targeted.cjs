'use strict';
// Local evidence/OS inspection only. Never launches an application or contacts listeners.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const b = require('./boundary.cjs');
const label = 'demo-targeted-delayed503-j4-j5-01';
const attempt = path.join(b.external, 'attempt-2026-10-07T05-57-56-402Z-7efd26');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const lines = file => fs.readFileSync(file, 'utf8').trim().split(/\r?\n/).filter(Boolean).map(JSON.parse);
const hash = data => crypto.createHash('sha256').update(data).digest('hex');
const result = read(path.join(attempt, 'results.json'));
const supervisor = read(path.join(attempt, 'supervisor.json'));
const rows = lines(path.resolve(__dirname, '../commands.jsonl')).filter(row => row.label === label);
if (rows.length !== 1) throw Error('Expected one uniquely labeled targeted run');
const parent = rows[0];
const events = lines(path.join(attempt, 'browser-events.jsonl'));
const recorded = lines(path.join(attempt, 'processes.jsonl')).flatMap(row => row.descendants || []);
recorded.push(supervisor.supervisorIdentity);
const live = b.processes();
const cleanup = { at: new Date().toISOString(), method: 'OS metadata only; PID plus creation identity, no listener contact or kill',
  remainingOwned: live.filter(p => recorded.some(r => r.pid === p.pid && r.born === p.born)), listeners: b.sockets(), dotenvNames: b.dotenvNames() };
const prior = read(path.resolve(__dirname, '../preservation-before.json'));
const manifest = prior.source.manifest.map(row => ({ ...row, sha256: hash(fs.readFileSync(path.join(b.worktree, row.path))) }));
const sourceManifestSha256 = hash(JSON.stringify(manifest));
const counts = Object.fromEntries(['PASS', 'FAIL', 'BLOCKED', 'NOT RUN'].map(status => [status, result.cells.filter(c => c.status === status).length]));
const selected = result.cells.filter(c => c.failure === 'delayed503' && ['J4', 'J5'].includes(c.journey));
const runtime = [...supervisor.serverRuntime.roots, ...supervisor.serverRuntime.listeners, supervisor.exerciseRuntime];
const checks = {
  exactSelection: result.selection.name === 'delayed503-j4-j5' && selected.length === 2 && selected.every(c => c.status === 'PASS'),
  thirteenNotRun: counts['NOT RUN'] === 13 && counts.PASS === 2 && counts.FAIL === 0 && counts.BLOCKED === 0,
  setupOnly: result.setup.length === 1 && result.setup[0].status === 'PASS',
  supplementalNotRun: result.supplemental.length === 4 && result.supplemental.every(r => r.status === 'NOT RUN'),
  cellLimits: [...result.setup, ...selected].every(c => Date.parse(c.finished) - Date.parse(c.started) < 75000),
  supervisorLimit: Date.parse(supervisor.finished) - Date.parse(supervisor.started) < 540000,
  parentLimit: parent.timeoutMs === 900000 && parent.durationMs < 900000 && !parent.timedOut,
  parentSuccess: parent.exitCode === 0 && !parent.error && parent.remainingOwned.length === 0,
  noUnexpectedErrors: result.errors.length === 0 && result.blocked.length === 0 && supervisor.serverLogFindings.length === 0,
  fixturesOnly: selected.every(c => c.injections.length === 2 && c.injections.every(i => i.mode === 'delayed503' && b.fixturePaths.has(i.path))),
  runtime: runtime.every(r => r.version === 'v22.20.0' && r.exactOwnedGuard && path.resolve(r.execPath) === path.resolve(parent.executable)),
  browserDriver: result.browserRuntime.launcherNode === 'v22.20.0' && result.browserRuntime.launcherPid === supervisor.exerciseRuntime.pid,
  supervisorCleanup: supervisor.remainingOwned.length === 0 && supervisor.listenersAfterCleanup.length === 0,
  independentCleanup: cleanup.remainingOwned.length === 0 && cleanup.listeners.length === 0,
  noDotenv: supervisor.dotenvNames.length === 0 && cleanup.dotenvNames.length === 0,
  protectedSourceUnchanged: sourceManifestSha256 === prior.source.sourceManifestSha256 && sourceManifestSha256 === parent.sourceManifestSha256,
  nextLabelUnused: !fs.existsSync(path.resolve(b.external, '../demo-targeted-delayed503-j4-j5-02.log')),
};
const summary = { recordedAt: new Date().toISOString(), attempt, label, status: Object.values(checks).every(Boolean) ? 'PASS: targeted continuation only' : 'REVIEW REQUIRED',
  checks, counts, selected: selected.map(c => ({ ...c, durationMs: Date.parse(c.finished) - Date.parse(c.started) })), setup: result.setup,
  supplemental: result.supplemental, parent, supervisorStatus: supervisor.status, runtime, browserRuntime: result.browserRuntime,
  cleanup, sourceManifestSha256, ledger: events.filter(e => e.kind === 'ledger-check'), mutations: result.mutations,
  screenshots: result.screenshots, ariaSnapshots: fs.readdirSync(attempt).filter(n => n.endsWith('.aria.txt')),
  history: 'Attempt03 remains 13 PASS / 1 BLOCKED / 1 NOT RUN after unchanged 540-second timeout. This is a separate two-cell attempt on a fresh store, not one clean 15/15. Historical failures and supplemental results remain unchanged.',
  handoff: 'No confirmed product or helper failure in this targeted attempt. Account-status PENDING, non-Web3 injected failures, formal accessibility, real services and restart persistence are not claimed.',
};
const output = path.join(b.external, 'targeted-summary-' + new Date().toISOString().replace(/[:.]/g, '-'));
fs.mkdirSync(output);
fs.writeFileSync(path.join(output, 'summary.json'), JSON.stringify(summary, null, 2) + '\n', { flag: 'wx' });
const inventory = [];
function inventoryTree(dir) {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['home', 'temp'].includes(item.name) && dir === attempt) continue;
    const file = path.join(dir, item.name);
    if (item.isDirectory()) inventoryTree(file);
    else if (item.isFile()) inventory.push({ path: path.relative(attempt, file), sha256: hash(fs.readFileSync(file)), bytes: fs.statSync(file).size });
  }
}
inventoryTree(attempt);
fs.writeFileSync(path.join(output, 'artifact-inventory.json'), JSON.stringify(inventory, null, 2) + '\n', { flag: 'wx' });
for (const name of ['summarize-targeted.cjs', 'restart-targeted-bounded.sh']) fs.copyFileSync(path.join(__dirname, name), path.join(output, name), fs.constants.COPYFILE_EXCL);
console.log(JSON.stringify({ output, ...summary }, null, 2));
process.exitCode = Object.values(checks).every(Boolean) ? 0 : 1;
