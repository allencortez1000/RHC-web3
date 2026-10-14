import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { inspectQaConfiguration, REQUIRED_KEYS } from './thirdweb-qa-preflight.mjs';

const fixture = {
  RHC_THIRDWEB_QA_PERMISSION_REF: 'RHC-QA-SYNTHETIC-UNIT-TEST',
  RHC_THIRDWEB_QA_CLIENT_ID: 'synthetic_client_id_never_use_with_provider',
  RHC_THIRDWEB_QA_CHAIN_ID: '11155111',
  RHC_THIRDWEB_QA_WALLET_MODE: 'external-metamask',
};

test('reports every missing key in one read, not only the first failed gate', () => {
  const r = inspectQaConfiguration({});
  assert.deepEqual(r.missingKeys, REQUIRED_KEYS);
  assert.equal(r.exitCode, 2);
  assert.equal(r.gateAllowed, false);
  assert.equal(r.configuration, 'MISSING_CONFIGURATION');
});
test('blank and whitespace values are missing, not configured', () => {
  const r = inspectQaConfiguration(Object.fromEntries(REQUIRED_KEYS.map(k => [k, '  '])));
  assert.equal(r.missingKeys.length, 4);
  assert.equal(r.exitCode, 2);
});
test('valid-looking configuration does not claim authorization or wallet connection', () => {
  const r = inspectQaConfiguration(fixture);
  assert.equal(r.gateAllowed, true);
  assert.equal(r.configuration, 'CONFIGURED_REQUIRES_OWNER_REVIEW');
  assert.equal(r.authorization, 'NOT_VERIFIED_BY_THIS_CHECK');
  assert.equal(r.providerProjectAndDomainRestrictions, 'NOT_VERIFIED');
  assert.equal(r.serverStarted, false);
  assert.equal(r.walletConnected, false);
  assert.equal(r.exitCode, 0);
});
test('neither Client ID nor approval reference is echoed in successful output', () => {
  const text = JSON.stringify(inspectQaConfiguration(fixture));
  assert.ok(!text.includes(fixture.RHC_THIRDWEB_QA_CLIENT_ID));
  assert.ok(!text.includes(fixture.RHC_THIRDWEB_QA_PERMISSION_REF));
});
test('invalid secret-like input is rejected and never echoed', () => {
  const fakeSecret = 'sk_SYNTHETIC_SECRET_MUST_NEVER_APPEAR';
  const r = inspectQaConfiguration({ ...fixture, RHC_THIRDWEB_QA_CLIENT_ID: fakeSecret });
  assert.equal(r.denialReason, 'CLIENT_ID_MISSING_OR_INVALID');
  assert.equal(r.exitCode, 2);
  assert.ok(!JSON.stringify(r).includes(fakeSecret));
});
for (const extra of [{ NODE_ENV: 'production' }, { NODE_ENV: 'test' }, { VERCEL: '1' }, { VERCEL_ENV: 'preview' }]) {
  test('reuses environment deny rule: ' + JSON.stringify(extra), () => {
    const r = inspectQaConfiguration({ ...fixture, ...extra });
    assert.equal(r.gateAllowed, false);
    assert.equal(r.denialReason, 'NOT_LOCAL_DEVELOPMENT');
  });
}
test('external Host is denied without echoing arbitrary argument text', () => {
  const host = 'sensitive-example.invalid';
  const r = inspectQaConfiguration(fixture, host);
  assert.equal(r.denialReason, 'HOST_NOT_LOOPBACK');
  assert.ok(!JSON.stringify(r).includes(host));
});
test('wrong network is not silently replaced with Sepolia', () => {
  const r = inspectQaConfiguration({ ...fixture, RHC_THIRDWEB_QA_CHAIN_ID: '1' });
  assert.equal(r.denialReason, 'CHAIN_NOT_EXPLICITLY_SELECTED');
  assert.equal(r.exitCode, 2);
});
test('unknown wallet method is not silently replaced with a default', () => {
  const r = inspectQaConfiguration({ ...fixture, RHC_THIRDWEB_QA_WALLET_MODE: 'anything' });
  assert.equal(r.denialReason, 'WALLET_METHOD_NOT_APPROVED');
});
test('inspection never mutates its input or calls fetch', () => {
  const before = JSON.stringify(fixture);
  const oldFetch = globalThis.fetch;
  globalThis.fetch = () => { throw new Error('FORBIDDEN_NETWORK_CALL'); };
  try { inspectQaConfiguration(Object.freeze({ ...fixture })); }
  finally { globalThis.fetch = oldFetch; }
  assert.equal(JSON.stringify(fixture), before);
});

const scriptURL = new URL('./thirdweb-qa-preflight.mjs', import.meta.url);
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
function runLoader(appDirectory, extra = {}) {
  const env = { ...process.env };
  for (const key of Object.keys(env)) {
    if (key.startsWith('RHC_THIRDWEB_QA_') || key === 'NODE_ENV' || key.startsWith('VERCEL') || key === '__NEXT_PROCESSED_ENV') delete env[key];
  }
  Object.assign(env, extra);
  const code = `import { loadLocalQaPreflight } from ${JSON.stringify(scriptURL.href)};\nconsole.log(JSON.stringify(loadLocalQaPreflight(${JSON.stringify(appDirectory)})));`;
  const r = spawnSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', code], {
    cwd: repo, env, encoding: 'utf8', windowsHide: true, timeout: 20000,
  });
  assert.equal(r.status, 0, 'loader child must complete');
  return { report: JSON.parse(r.stdout), output: r.stdout + r.stderr };
}
test('Next env loader reads app-local development config and emits no values', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rhc-qa-env-test-'));
  try {
    fs.writeFileSync(path.join(dir, '.env.development.local'), Object.entries(fixture).map(([k, v]) => k + '=' + v).join('\n'));
    const r = runLoader(dir);
    assert.equal(r.report.configuration, 'CONFIGURED_REQUIRES_OWNER_REVIEW');
    assert.deepEqual(r.report.loadedEnvironmentFiles, ['.env.development.local']);
    assert.ok(!r.output.includes(fixture.RHC_THIRDWEB_QA_CLIENT_ID));
    assert.ok(!r.output.includes(fixture.RHC_THIRDWEB_QA_PERMISSION_REF));
    assert.equal(r.report.walletConnected, false);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
test('shell overrides use Next precedence rather than hidden .env fallback', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rhc-qa-env-test-'));
  try {
    fs.writeFileSync(path.join(dir, '.env.local'), Object.entries(fixture).map(([k, v]) => k + '=' + v).join('\n'));
    const r = runLoader(dir, { RHC_THIRDWEB_QA_CHAIN_ID: '1' });
    assert.equal(r.report.gateAllowed, false);
    assert.equal(r.report.denialReason, 'CHAIN_NOT_EXPLICITLY_SELECTED');
    assert.ok(!r.output.includes(fixture.RHC_THIRDWEB_QA_CLIENT_ID));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
test('an empty app directory reports missing configuration without creating files', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rhc-qa-env-test-'));
  try {
    const r = runLoader(dir);
    assert.equal(r.report.missingKeys.length, 4);
    assert.equal(r.report.exitCode, 2);
    assert.deepEqual(fs.readdirSync(dir), []);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
