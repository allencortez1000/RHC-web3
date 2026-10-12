'use strict';
/* OFF25 preparatory tests: entirely synthetic, no signing/SDK/provider calls. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../../..');
const dependencyRoot = 'C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-frontend-web3';
require(path.join(root, 'apps/customer-web/tests/offline-network.cjs'));
const ts = require(require.resolve('typescript', { paths: [dependencyRoot] }));
const modulePath = path.join(root, 'packages/web3/src/off25-synthetic-identity.ts');
const previousLoader = require.extensions['.ts'];
require.extensions['.ts'] = (module, filename) => {
  if (filename !== modulePath) throw new Error('Unapproved TS source imported from ' + filename);
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    reportDiagnostics: true,
  });
  if (compiled.diagnostics && compiled.diagnostics.some(x => x.category === ts.DiagnosticCategory.Error)) {
    throw new Error('OFF25 TS transpilation failure');
  }
  module._compile(compiled.outputText, filename);
};
const { compareSyntheticTokenMetadata, SYNTHETIC_REFERENCE_SCOPE } = require(modulePath);
require.extensions['.ts'] = previousLoader;

const address = '0x' + 'a'.repeat(40);
const expected = Object.freeze({
  scope: 'OFFLINE_TEST_FIXTURE_ONLY',
  chainId: 43210, contractAddress: address,
  name: 'Synthetic Sample', symbol: 'TST', decimals: 18,
});
const observed = value => ({ status: 'observed', value });
function sample() {
  return {
    source: 'thirdweb_testnet', configuration: 'valid', connection: 'ready',
    snapshot: 'fresh', chain: { id: 43210, name: 'Invented chain' },
    contractAddress: address,
    data: {
      name: observed('Synthetic Sample'), symbol: observed('TST'), decimals: observed(18),
      totalSupply: observed({ raw: '0', formatted: '0' }),
      cap: { status: 'unsupported', value: null },
      paused: { status: 'unsupported', value: null },
    },
    block: { number: '12', hash: '0x' + 'b'.repeat(64), timestamp: '321', finality: 'observed' },
  };
}
function compare(mutator, fixture = expected) {
  const value = sample();
  if (typeof mutator === 'function') mutator(value);
  return compareSyntheticTokenMetadata(value, fixture);
}
function notOfficial(v) {
  assert.equal(v.officialTokenVerified, false);
  assert.equal(v.issuerSignatureVerified, false);
  assert.equal(v.releaseAuthorized, false);
  assert.equal(v.scope, SYNTHETIC_REFERENCE_SCOPE);
}
function expectUnverifiable(fn, reason) {
  const result = fn();
  assert.equal(result.comparison, 'UNVERIFIABLE');
  assert.equal(result.reason, reason);
  assert.deepEqual(result.mismatchedFields, []);
  notOfficial(result);
}
function expectDrift(mutator, fields, ref) {
  const result = compare(mutator, ref);
  assert.equal(result.comparison, 'MISMATCH');
  assert.equal(result.reason, 'METADATA_DIFFERENT');
  assert.deepEqual(result.mismatchedFields, fields);
  notOfficial(result);
}
test('OFF25-prep 01: default fixture comparator NEVER certifies an official token', () => {
  assert.equal(SYNTHETIC_REFERENCE_SCOPE, 'OFFLINE_TEST_FIXTURE_ONLY');
  const result = compare();
  assert.equal(result.comparison, 'MATCHES_SYNTHETIC_FIXTURE');
  assert.equal(result.reason, 'SYNTHETIC_VALUES_AGREE');
  notOfficial(result);
});
test('OFF25-prep 02: no reference fails closed instead of declaring a match', () =>
  expectUnverifiable(() => compareSyntheticTokenMetadata(sample(), null), 'NO_ISSUER_APPROVAL'));
test('OFF25-prep 03: wrong fixture scope fails closed', () =>
  expectUnverifiable(() => compare(null, { ...expected, scope: 'SIGNED_RELEASE' }), 'INVALID_SYNTHETIC_REFERENCE'));
test('OFF25-prep 04: chain ID must be positive safe integer', () => {
  for (const n of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, NaN]) {
    expectUnverifiable(() => compare(null, { ...expected, chainId: n }), 'INVALID_SYNTHETIC_REFERENCE');
  }
});
test('OFF25-prep 05: rejects zero and malformed reference addresses', () => {
  for (const a of ['0x' + '0'.repeat(40), '0x1234', '0x' + 'g'.repeat(40)]) {
    expectUnverifiable(() => compare(null, { ...expected, contractAddress: a }), 'INVALID_SYNTHETIC_REFERENCE');
  }
});
test('OFF25-prep 06: rejects invalid expected name, Unicode confusables and bidi text', () => {
  for (const name of ['', ' Leading', 'Trailing ', 'Tοken', 'Token\u202eX', 'X'.repeat(81)]) {
    expectUnverifiable(() => compare(null, { ...expected, name }), 'INVALID_SYNTHETIC_REFERENCE');
  }
});
test('OFF25-prep 07: rejects invalid symbol and precision bounds', () => {
  for (const symbol of ['a', '', 'X'.repeat(13), 'T-ST', 'TOK\u0000']) {
    expectUnverifiable(() => compare(null, { ...expected, symbol }), 'INVALID_SYNTHETIC_REFERENCE');
  }
  for (const decimals of [-1, 256, 18.5, Infinity]) {
    expectUnverifiable(() => compare(null, { ...expected, decimals }), 'INVALID_SYNTHETIC_REFERENCE');
  }
});
test('OFF25-prep 08: no data from disabled/synthetic source may match', () => {
  for (const source of ['synthetic', 'disabled']) {
    expectUnverifiable(() => compare(x => { x.source = source; }), 'INVALID_READ_SOURCE');
  }
});
test('OFF25-prep 09: invalid configuration never treated as approved', () =>
  expectUnverifiable(() => compare(x => { x.configuration = 'invalid'; }), 'INVALID_READ_SOURCE'));
test('OFF25-prep 10: stale/absent snapshots never considered comparable', () => {
  for (const snapshot of ['stale', 'absent']) {
    expectUnverifiable(() => compare(x => { x.snapshot = snapshot; }), 'INVALID_READ_SOURCE');
  }
});
test('OFF25-prep 11: missing or forged block provenance prevents comparison', () => {
  for (const value of [null, { ...sample().block, hash: null }, { ...sample().block, hash: '0x' + 'z'.repeat(64) },
    { ...sample().block, number: '01' }, { ...sample().block, finality: 'finalized' }]) {
    expectUnverifiable(() => compare(x => { x.block = value; }), 'MISSING_PINNED_OBSERVATION');
  }
});
test('OFF25-prep 12: missing network/contract or invalid observed address prevents comparison', () => {
  expectUnverifiable(() => compare(x => { x.chain = null; }), 'MISSING_PINNED_OBSERVATION');
  expectUnverifiable(() => compare(x => { x.contractAddress = null; }), 'MISSING_PINNED_OBSERVATION');
  expectUnverifiable(() => compare(x => { x.contractAddress = '0x' + '0'.repeat(40); }), 'MISSING_PINNED_OBSERVATION');
});
test('OFF25-prep 13: missing name, symbol or decimals never interpreted as zero/false', () => {
  for (const field of ['name', 'symbol', 'decimals']) {
    expectUnverifiable(() => compare(x => { x.data[field] = { status: 'unavailable', value: null }; }), 'REQUIRED_METADATA_UNAVAILABLE');
  }
  expectUnverifiable(() => compare(x => { x.data = null; }), 'REQUIRED_METADATA_UNAVAILABLE');
});
test('OFF25-prep 14: wrong chain is detected exactly', () =>
  expectDrift(x => { x.chain.id = 43211; }, ['chainId']));
test('OFF25-prep 15: wrong contract address is detected exactly', () =>
  expectDrift(x => { x.contractAddress = '0x' + 'c'.repeat(40); }, ['contractAddress']));
test('OFF25-prep 16: name is compared exactly, without case folding', () =>
  expectDrift(x => { x.data.name.value = 'synthetic Sample'; }, ['name']));
test('OFF25-prep 17: symbol is compared exactly, without case folding', () =>
  expectDrift(x => { x.data.symbol.value = 'tst'; }, ['symbol']));
test('OFF25-prep 18: decimals drift is detected, not confused with totalSupply', () =>
  expectDrift(x => { x.data.decimals.value = 6; }, ['decimals']));
test('OFF25-prep 19: all five differences are surfaced in deterministic field order', () =>
  expectDrift(x => {
    x.chain.id = 3; x.contractAddress = '0x' + 'd'.repeat(40);
    x.data.name.value = 'Other'; x.data.symbol.value = 'NOPE'; x.data.decimals.value = 0;
  }, ['chainId', 'contractAddress', 'name', 'symbol', 'decimals']));
test('OFF25-prep 20: address hex case is equivalent (without normalizing other fields)', () => {
  const result = compare(null, { ...expected, contractAddress: address.toUpperCase().replace('0X', '0x') });
  assert.equal(result.comparison, 'MATCHES_SYNTHETIC_FIXTURE');
  notOfficial(result);
});
test('OFF25-prep 21: zero decimals is valid when exactly expected', () => {
  const ref = { ...expected, decimals: 0 };
  const result = compare(x => { x.data.decimals.value = 0; }, ref);
  assert.equal(result.comparison, 'MATCHES_SYNTHETIC_FIXTURE');
  notOfficial(result);
});
test('OFF25-prep 22: missing OPTIONAL cap/paused does not invent required metadata', () => {
  const result = compare(x => {
    x.snapshot = 'partial'; x.connection = 'degraded';
    x.data.paused = { status: 'unavailable', value: null };
    x.data.cap = { status: 'unavailable', value: null };
  });
  assert.equal(result.comparison, 'MATCHES_SYNTHETIC_FIXTURE');
  notOfficial(result);
});
test('OFF25-prep 23: observations and caller input are immutable during comparison', () => {
  const snapshot = sample(),before=structuredClone(snapshot),expectation = structuredClone(expected);
  const result = compareSyntheticTokenMetadata(snapshot, expected);
  assert.deepEqual(snapshot, before); assert.deepEqual(expected, expectation);
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.mismatchedFields), true);
});
test('OFF25-prep 24: code is isolated—no SDK, fetch, signing, or production export', () => {
  const source = fs.readFileSync(modulePath, 'utf8');
  const entry = fs.readFileSync(path.join(root, 'packages/web3/src/index.ts'), 'utf8');
  const config = fs.readFileSync(path.join(root, 'packages/web3/src/config.ts'), 'utf8');
  assert.doesNotMatch(source, /\bfetch\s*\(|\bXMLHttpRequest\b|\bsendTransaction\b|\bsignMessage\b|createThirdwebClient/);
  assert.doesNotMatch(entry, /off25-synthetic-identity/);
  assert.match(config, /APPROVED_TESTNETS[\s\S]*Object\.freeze\(\[\]\)/);
  assert.doesNotMatch(source, /officialTokenVerified:\s*true/);
  assert.doesNotMatch(source, /releaseAuthorized:\s*true/);
});
