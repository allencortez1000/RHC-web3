'use strict';
// Read-only with respect to all attempts, stores, product files and processes.
// Writes only a NEW external summary directory. No requests, starts or kills.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const b = require('./boundary.cjs');
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const attempts = [];
const identities = new Set();
for (const name of fs.readdirSync(b.external).filter(n => n.startsWith('attempt-')).sort()) {
  const dir = path.join(b.external, name);
  const s = JSON.parse(fs.readFileSync(path.join(dir, 'supervisor.json'), 'utf8'));
  const r = JSON.parse(fs.readFileSync(path.join(dir, 'results.json'), 'utf8'));
  const deadline = /TIMEOUT: bounded supervisor deadline/.test(s.error || '');
  const cells = r.cells.map(cell => ({ journey: cell.journey, failure: cell.failure,
    status: cell.status === 'RUNNING' ? 'BLOCKED' : cell.status, rawStatus: cell.status,
    reason: cell.status === 'RUNNING' ? (deadline ? 'Interrupted by original supervisor deadline; not a product assertion failure' : 'Interrupted; no final assertion result') : cell.reason,
    error: cell.error, started: cell.started, finished: cell.finished,
    injectionCount: cell.injections?.length ?? null,
  }));
  const counts = Object.fromEntries(['PASS', 'FAIL', 'BLOCKED', 'NOT RUN'].map(status => [status, cells.filter(c => c.status === status).length]));
  const serverDiagnostics = ['customer', 'admin'].flatMap(label => fs.readFileSync(path.join(dir, label + '.log'), 'utf8').split(/\r?\n/)
    .filter(line => /^(?:Error|TypeError|ReferenceError|SyntaxError|RangeError):|DEMO_NETWORK_BLOCKED/.test(line)).map(line => ({ label, line })));
  const world = JSON.parse(fs.readFileSync(path.join(dir, 'store/world.json'), 'utf8'));
  const instanceFiles = fs.readdirSync(dir).filter(n => /^node-runtime-.*\.jsonl$/.test(n));
  const runtimes = instanceFiles.flatMap(n => fs.readFileSync(path.join(dir, n), 'utf8').trim().split(/\r?\n/).map(line => JSON.parse(line)));
  const browserNode = runtimes.find(x => x.pid === r.browserRuntime?.launcherPid && x.role === 'exercise') || s.exerciseRuntime;
  const processes = fs.readFileSync(path.join(dir, 'processes.jsonl'), 'utf8').trim().split(/\r?\n/).map(line => JSON.parse(line));
  for (const event of processes) for (const instance of event.descendants || []) identities.add(instance.pid + ':' + instance.born);
  attempts.push({ name, directory: dir, supervisorStatus: s.status, exerciseRawStatus: r.status, deadline,
    started: s.started, finished: s.finished, counts, cells, supplemental: r.supplemental,
    browserErrors: r.errors, boundaryBlocked: r.blocked, serverDiagnostics,
    runtime: { supervisor: { node: s.node, executable: s.execPath }, servers: s.serverRuntime, browserNode, browser: r.browserRuntime },
    cleanup: { remainingOwned: s.remainingOwned, listeners: s.listenersAfterCleanup, actions: s.cleanup },
    screenshots: fs.readdirSync(dir).filter(n => n.endsWith('.png')).length,
    accessibilitySnapshots: fs.readdirSync(dir).filter(n => n.endsWith('.aria.txt')).length,
    store: { path: path.join(dir, 'store/world.json'), sha256: hash(path.join(dir, 'store/world.json')), revision: world.revision,
      reservations: world.reservations.length, cancelledReservations: world.reservations.filter(x => x.status === 'CANCELLED').length,
      ownedDocuments: world.documents.filter(x => x.title.startsWith('Synthetic owned demo ')).map(x => ({ title: x.title, status: x.status })) },
    rawEvidenceHashes: { results: hash(path.join(dir, 'results.json')), supervisor: hash(path.join(dir, 'supervisor.json')) },
  });
}
const parentRows = fs.readFileSync(path.resolve(__dirname, '../commands.jsonl'), 'utf8').trim().split(/\r?\n/).map(line => JSON.parse(line)).filter(row => /^demo-owned-exercise-0[123]$/.test(row.label));
const latest = attempts.at(-1);
const finalCheck = { at: new Date().toISOString(), dotenvNames: b.dotenvNames(), listeners: b.sockets(),
  remainingRecordedOwned: b.processes().filter(p => identities.has(p.pid + ':' + p.born)) };
const summary = { status: latest.deadline ? 'INCOMPLETE — bounded deadline honored' : latest.supervisorStatus,
  note: 'Raw attempts are immutable. RUNNING is normalized to BLOCKED only in this new report. Earlier passes are not promoted into a fabricated final 15/15.',
  attempts, parentRuns: parentRows, finalCheck,
  handoffs: [
    { owner: 'Parent/release owner', status: 'BLOCKED', item: 'Latest delayed503 J4 interrupted; delayed503 J5 NOT RUN after helper correction. J4 had passed in attempt 02, but that is not a pass in attempt 03. Decide on a separately authorized bounded targeted follow-up; no limits increased here.' },
    { owner: 'Frontend test-helper owner', status: 'RESOLVED IN OWNED HELPERS', item: 'Response-body-after-admin-navigation, label/text selectors, PID reuse audit collision and admin skip-target assumption. First and second failures preserved in investigation notes.' },
    { owner: 'Protected product owners', status: 'NO CONFIRMED DEFECT', item: 'No product edits or confirmed protected-code assertion defect. Do not classify internal deadline or helper failures as product failures.' },
    { owner: 'Acceptance owner', status: 'NOT RUN', item: 'Account-status PENDING, synthetic non-Web3 failures, real backend/provider/DB, formal accessibility and server-restart persistence remain outside demonstrated coverage.' },
  ],
};
const output = path.join(b.external, 'summary-' + new Date().toISOString().replace(/[:.]/g, '-'));
fs.mkdirSync(output);
fs.writeFileSync(path.join(output, 'summary.json'), JSON.stringify(summary, null, 2) + '\n', { flag: 'wx' });
const rows = ['| Journey | HTTP503 | Connection failure | Delayed503 |', '| --- | --- | --- | --- |'];
for (const journey of ['J1', 'J2', 'J3', 'J4', 'J5']) rows.push('| ' + journey + ' | ' + ['http503', 'connectionfailed', 'delayed503'].map(f => latest.cells.find(c => c.journey === journey && c.failure === f).status).join(' | ') + ' |');
fs.writeFileSync(path.join(output, 'summary.md'), '# Bounded demo result\n\n' + summary.status + '\n\n' + rows.join('\n') + '\n\n' + summary.note + '\n\nSee summary.json for all original attempt counts, runtime/process cleanup, screenshots, hashes and owner handoffs.\n', { flag: 'wx' });
console.log(JSON.stringify({ output, latest: latest.name, counts: latest.counts, supplemental: latest.supplemental.map(x => ({ name: x.name, status: x.status })),
  attempts: attempts.map(x => ({ name: x.name, counts: x.counts, screenshots: x.screenshots, accessibilitySnapshots: x.accessibilitySnapshots, serverDiagnostics: x.serverDiagnostics.length })),
  finalCheck, parentRuns: parentRows.map(x => ({ label: x.label, timedOut: x.timedOut, remainingOwned: x.remainingOwned, sourceManifestSha256: x.sourceManifestSha256 })),
}, null, 2));
if (finalCheck.listeners.length || finalCheck.remainingRecordedOwned.length) process.exitCode = 2;
