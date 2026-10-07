'use strict';
// Inherited by direct Next CLI roots, their Node descendants and the browser-driving
// Node child. Never include environment values, cookies, request bodies or argv.
const fs = require('node:fs');
const path = require('node:path');
const { threadId } = require('node:worker_threads');
const boundary = require('./boundary.cjs');
if (process.env.DEMO_EXACT_NETWORK !== '1') throw Error('BLOCKED: demo runtime preload requires the exact-owned network guard');
const output = boundary.canonical(process.env.DEMO_OUTPUT || '');
const relative = path.relative(boundary.canonical(boundary.external), output);
if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) throw Error('BLOCKED: runtime audit outside a fresh external demo directory');
const record = {
  at: new Date().toISOString(), startedAtMs: Math.round(Date.now() - process.uptime() * 1000), pid: process.pid, ppid: process.ppid, threadId,
  role: process.env.DEMO_CHILD_ROLE || 'unknown', execPath: process.execPath,
  version: process.version, cwd: process.cwd(), exactOwnedGuard: true,
};
// Windows reuses PIDs for short-lived Next workers. Append process-instance
// records rather than crashing a later worker or overwriting earlier evidence.
fs.appendFileSync(path.join(output, `node-runtime-${process.pid}-${threadId}.jsonl`), JSON.stringify(record) + '\n');
console.log('[DEMO_NODE_RUNTIME] ' + JSON.stringify(record));
if (process.version !== 'v22.20.0' || path.resolve(process.execPath).toLowerCase() !== path.resolve(process.env.DEMO_NODE_EXECUTABLE || '').toLowerCase()) {
  throw Error('BLOCKED: demo child must use the selected Node v22.20.0 executable');
}
