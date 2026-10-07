'use strict';
// Safe preparation only: syntax checks, pure denial self-tests and OS-only dry-run.
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const root = path.resolve(__dirname, '../../../../../../..');
const external = path.resolve(root, '../RHC-web3-allen-frontend-web3-evidence/20261007T040805Z/demo');
fs.mkdirSync(external, { recursive: true });
const output = path.join(external, 'validation-' + new Date().toISOString().replace(/[:.]/g, '-'));
fs.mkdirSync(output);
const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => ['path', 'systemroot', 'windir', 'comspec', 'pathext', 'temp', 'tmp', 'systemdrive'].includes(key.toLowerCase())));
const commands = [];
function run(label, args, timeout = 15000, extraEnv = {}) {
  const fd = fs.openSync(path.join(output, label + '.log'), 'wx');
  const started = new Date().toISOString();
  let result;
  try { result = cp.spawnSync(process.execPath, args, { cwd: root, env: { ...env, ...extraEnv }, timeout, windowsHide: true, stdio: ['ignore', fd, fd] }); }
  finally { fs.closeSync(fd); }
  const row = { label, started, finished: new Date().toISOString(), node: process.version, executable: process.execPath, args, exit: result.status, error: result.error?.message };
  commands.push(row); fs.writeFileSync(path.join(output, 'commands.json'), JSON.stringify(commands, null, 2));
  console.log(label + ': ' + result.status + '\n' + fs.readFileSync(path.join(output, label + '.log'), 'utf8'));
  return result.status === 0;
}
let passed = true;
for (const file of ['boundary.cjs', 'supervisor.cjs', 'exercise.cjs', 'runtime-preload.cjs', 'real-response-delay.cjs', 'real-response-delay.test.cjs', 'races.cjs', 'self-test.cjs', 'selection.cjs', 'selection.test.cjs', 'validate.cjs']) {
  if (!run('syntax-' + file, ['--check', path.join(__dirname, file)])) passed = false;
}
if (passed) {
  if (!run('selection-test', [path.join(__dirname, 'selection.test.cjs')])) passed = false;
  if (!run('self-test', [path.join(__dirname, 'self-test.cjs')])) passed = false;
  if (!run('real-response-delay-test', [path.join(__dirname, 'real-response-delay.test.cjs')])) passed = false;
  if (!run('runtime-preload-no-app', ['--require', path.join(__dirname, 'runtime-preload.cjs'), '-e', "console.log('Runtime audit preload only: no application, browser, network or store')"], 15000, {
    DEMO_EXACT_NETWORK: '1', DEMO_OUTPUT: output, DEMO_NODE_EXECUTABLE: process.execPath, DEMO_CHILD_ROLE: 'validation-no-app',
  })) passed = false;
  if (!run('dry-run', [path.join(__dirname, 'supervisor.cjs'), '--dry-run', '--parent-builds-complete', '--runner', path.resolve(__dirname, '../run.cjs')], 30000)) passed = false;
  if (!run('targeted-dry-run', [path.join(__dirname, 'supervisor.cjs'), '--dry-run', '--selection', 'delayed503-j4-j5', '--parent-builds-complete', '--parent-intercepted-suites-complete', '--runner', path.resolve(__dirname, '../run.cjs')], 30000)) passed = false;
}
console.log(JSON.stringify({ status: passed ? 'PREPARATION VALIDATED / NOT EXECUTED' : 'VALIDATION FAILED', output, serversStarted: 0, browserLaunched: false, storeCreated: false }));
process.exitCode = passed ? 0 : 1;
