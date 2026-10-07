const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
// As in the existing demo harness, transpile isolated local sources for offline tests.
// This is not a replacement for the separate full SDK build/typecheck gate.
const sourceRoot = path.resolve(__dirname, '../src') + path.sep;
const previousTsLoader = require.extensions['.ts'];
require.extensions['.ts'] = (module, filename) => {
  if (!filename.startsWith(sourceRoot)) {
    if (previousTsLoader) return previousTsLoader(module, filename);
    throw new Error('Unexpected TypeScript source outside connector');
  }
  const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  module._compile(output, filename);
};
const { createReadProvider } = require('../src/index.ts');
const { readConfig, APPROVED_TESTNETS } = require('../src/config.ts');
const { formatAmount, boundText, emptyResult, observed, amountField, unavailable } = require('../src/snapshot.ts');
const { ThirdwebReadProvider } = require('../src/thirdweb-read-provider.ts');
const { ReadError } = require('../src/errors.ts');
const { createTransport } = require('../src/transport.ts');

// Synthetic test-only identifiers, never a deployment/network approval.
const approval = { id: 31337, name: 'Synthetic test chain', contractAddress: `0x${'1'.repeat(40)}`, explorerOrigin: 'https://explorer.example.test', optionalReads: [], approvalReference: 'UNIT_TEST_ONLY' };
const env = { RHC_WEB3_PROVIDER: 'thirdweb', ENABLE_WEB3_READ_PREVIEW: 'true', RHC_WEB3_ALLOW_NETWORK_READS: 'true', RHC_WEB3_CHAIN_ID: '31337', RHC_WEB3_TOKEN_CONTRACT_ADDRESS: approval.contractAddress, THIRDWEB_SECRET_KEY: 'offline-only-never-a-real-key' };
const config = () => readConfig(env, 'test', [approval]);
function successful(c = config()) {
  return { ...emptyResult(c), connection: 'ready', snapshot: 'fresh', data: {
    name: observed('Synthetic'), symbol: observed('TEST'), decimals: observed(6), totalSupply: observed({ raw: '0', formatted: '0' }), cap: { status: 'unsupported', value: null }, paused: { status: 'unsupported', value: null },
  }, block: { number: '123', hash: `0x${'a'.repeat(64)}`, timestamp: '100', finality: 'observed' } };
}

test('default disabled startup and diagnostics need no credentials or provider fetch', async () => {
  const original = global.fetch;
  global.fetch = () => { throw new Error('Unexpected egress'); };
  try {
    const provider = createReadProvider({});
    for (const result of [await provider.getTokenSnapshot(), await provider.getReadStatus()]) {
      assert.equal(result.connection, 'disabled'); assert.equal(result.data, null);
    }
    assert.equal(Object.keys(require.cache).some((path) => /thirdweb[\\/]dist/.test(path)), false);
  } finally { global.fetch = original; }
});
test('approved network list ships empty; configuration cannot invent approval', () => {
  assert.deepEqual(APPROVED_TESTNETS, []);
  assert.equal(readConfig(env, 'connected').code, 'CHAIN_NOT_APPROVED');
});
test('fixture is synthetic without address, explorer, or a claimed successful chain read', async () => {
  const result = await createReadProvider({ RHC_WEB3_PROVIDER: 'fixture' }, 'test').getTokenSnapshot();
  assert.equal(result.source, 'synthetic'); assert.equal(result.explorerUrl, null); assert.equal(result.contractAddress, null); assert.equal(result.lastSuccessAt, null);
  assert.match(result.data.name.value, /Synthetic/);
});
test('connected fixture is denied and never acts as live fallback', async () => {
  const result = await createReadProvider({ RHC_WEB3_PROVIDER: 'fixture' }).getTokenSnapshot();
  assert.equal(result.diagnosticCode, 'FIXTURE_NOT_ALLOWED'); assert.equal(result.data, null);
});
for (const marker of [{ RHC_APP_PROFILE: 'demo' }, { RHC_DEMO_MODE: '1' }, { NEXT_PUBLIC_RHC_DATA_MODE: 'demo' }]) {
  test(`demo marker ${Object.keys(marker)[0]} blocks thirdweb under conflicting config`, async () => {
    assert.equal((await createReadProvider({ ...env, ...marker }, 'connected').getTokenSnapshot()).diagnosticCode, 'DEMO_EGRESS_BLOCKED');
    assert.equal((await createReadProvider({ ...env, ...marker }, 'demo').getTokenSnapshot()).source, 'synthetic');
  });
}
for (const [override, code] of [
  [{ RHC_WEB3_PROVIDER: 'unknown' }, 'INVALID_PROVIDER'],
  [{ ENABLE_WEB3_READ_PREVIEW: 'TRUE' }, 'INVALID_BOOLEAN'],
  [{ RHC_WEB3_ALLOW_NETWORK_READS: 'false' }, 'NETWORK_READS_NOT_AUTHORIZED'],
  [{ RHC_WEB3_NETWORK_MODE: 'mainnet' }, 'TESTNET_ONLY'],
  [{ RHC_WEB3_CHAIN_ID: '' }, 'CHAIN_NOT_CONFIGURED'],
  [{ RHC_WEB3_CHAIN_ID: '1' }, 'CHAIN_NOT_APPROVED'],
  [{ RHC_WEB3_TOKEN_CONTRACT_ADDRESS: '' }, 'CONTRACT_NOT_CONFIGURED'],
  [{ RHC_WEB3_TOKEN_CONTRACT_ADDRESS: `0x${'2'.repeat(40)}` }, 'CONTRACT_NOT_APPROVED'],
  [{ THIRDWEB_SECRET_KEY: '' }, 'SECRET_NOT_CONFIGURED'],
  [{ RHC_WEB3_READ_TIMEOUT_MS: '0' }, 'INVALID_TIMING'],
  [{ RHC_WEB3_CACHE_TTL_SECONDS: '200', RHC_WEB3_MAX_STALE_SECONDS: '20' }, 'INVALID_TIMING'],
]) test(`invalid config: ${code} ${Object.keys(override)[0]}`, () => assert.equal(readConfig({ ...env, ...override }, 'connected', [approval]).code, code));
test('approved explorer is constructed only from reviewed origin and exact address', () => {
  const result = emptyResult(config());
  assert.equal(result.explorerUrl, `https://explorer.example.test/address/${approval.contractAddress}`);
  for (const explorerOrigin of ['http://example.test', 'https://name:secret@example.test', 'https://example.test/?secret=foo']) assert.equal(readConfig(env, 'test', [{ ...approval, explorerOrigin }]).code, 'INVALID_APPROVAL');
});
test('exact large supplies and decimals 0, 6, 18, 255; zero differs from unknown', () => {
  assert.equal(formatAmount(12345678901234567890123456n, 6), '12345678901234567890.123456');
  assert.equal(formatAmount(0n, 18), '0'); assert.equal(formatAmount(12n, 0), '12');
  assert.equal(formatAmount(1n, 255), `0.${'0'.repeat(254)}1`);
  assert.deepEqual(amountField(unavailable(), observed(18)), { status: 'unavailable', value: null });
  assert.deepEqual(amountField(observed(0n), unavailable()), observed({ raw: '0', formatted: null }));
  assert.throws(() => formatAmount(1n, 256));
});
test('metadata text is bounded, strips control/bidi characters, not fetched/interpreted', () => {
  assert.equal(boundText('x'.repeat(1000)).length, 120);
  assert.equal(boundText('\u0000\u202e<script>alert(1)</script>'), '<script>alert(1)</script>');
});
test('status never probes, inflight requests deduplicate, and fresh cache does not reread', async () => {
  let calls = 0; let release;
  const provider = new ThirdwebReadProvider(config(), async () => { calls++; await new Promise((resolve) => { release = resolve; }); return successful(); });
  assert.equal((await provider.getReadStatus()).diagnosticCode, 'NOT_READ'); assert.equal(calls, 0);
  const reads = Array.from({ length: 20 }, () => provider.getTokenSnapshot());
  assert.equal(calls, 1); release(); await Promise.all(reads);
  const result = await provider.getTokenSnapshot(); assert.equal(calls, 1); assert.equal(result.snapshot, 'fresh');
  result.data.name.value = 'mutated'; assert.equal((await provider.getReadStatus()).data.name.value, 'Synthetic');
});
test('one transient retry maximum; both attempts share one deadline', async () => {
  let calls = 0; const signals = [];
  const provider = new ThirdwebReadProvider(config(), async (_c, signal) => { calls++; signals.push(signal); throw new ReadError('TRANSIENT'); });
  assert.equal((await provider.getTokenSnapshot()).diagnosticCode, 'TRANSIENT'); assert.equal(calls, 2); assert.equal(signals[0], signals[1]);
  await provider.getTokenSnapshot(); assert.equal(calls, 2);
});
for (const code of ['PROVIDER_AUTH', 'WRONG_CHAIN', 'NO_CONTRACT', 'RATE_LIMITED']) test(`${code} is not retried`, async () => {
  let calls = 0;
  const provider = new ThirdwebReadProvider(config(), async () => { calls++; throw new ReadError(code); });
  assert.equal((await provider.getTokenSnapshot()).diagnosticCode, code); assert.equal(calls, 1);
});
test('rate backoff suppresses calls beyond TTL without making health claims', async () => {
  let time = 100000; let calls = 0;
  const provider = new ThirdwebReadProvider(config(), async () => { calls++; throw new ReadError('RATE_LIMITED', 600000); }, () => time);
  await provider.getTokenSnapshot(); time += 300000; await provider.getTokenSnapshot(); assert.equal(calls, 1);
  time += 300001; await provider.getTokenSnapshot(); assert.equal(calls, 2);
});
test('stale data retains success timestamp, expires, and never becomes current health', async () => {
  let time = 100000; let fail = false;
  const provider = new ThirdwebReadProvider(config(), async () => { if (fail) throw new ReadError('PROVIDER_UNAVAILABLE'); return successful(); }, () => time);
  const first = await provider.getTokenSnapshot(); fail = true; time += 31000;
  const stale = await provider.getTokenSnapshot(); assert.equal(stale.snapshot, 'stale'); assert.equal(stale.lastSuccessAt, first.lastSuccessAt); assert.equal(stale.connection, 'degraded');
  time += 120000; const expired = await provider.getReadStatus(); assert.equal(expired.data, null); assert.equal(expired.snapshot, 'absent'); assert.equal(expired.lastSuccessAt, first.lastSuccessAt);
});
test('configuration/source changes invalidate cached provider without leaking credentials', async () => {
  const mutable = { RHC_WEB3_PROVIDER: 'fixture' }; const provider = createReadProvider(mutable, 'test');
  assert.ok((await provider.getTokenSnapshot()).data); mutable.RHC_WEB3_PROVIDER = 'disabled'; assert.equal((await provider.getReadStatus()).data, null);
  Object.assign(mutable, env); const output = JSON.stringify(await provider.getTokenSnapshot()); assert.ok(!output.includes(env.THIRDWEB_SECRET_KEY));
});
test('providers never merge metadata from separate chains or contracts', async () => {
  const a = config(); const b = { ...config(), approval: { ...approval, id: 31338, contractAddress: `0x${'2'.repeat(40)}` } };
  const first = new ThirdwebReadProvider(a, async () => successful(a));
  const second = new ThirdwebReadProvider(b, async () => { throw new ReadError('PROVIDER_UNAVAILABLE'); });
  assert.ok((await first.getTokenSnapshot()).data); const result = await second.getTokenSnapshot(); assert.equal(result.chain.id, 31338); assert.equal(result.data, null);
});
test('timeout aborts stalled body, deduplicates callers, and leaves no active requests', async () => {
  let active = 0; let calls = 0;
  const provider = new ThirdwebReadProvider({ ...config(), timeoutMs: 30 }, async (_config, signal) => {
    const transport = createTransport(31337, 'fixture', 'secret-fixture', signal, async (_url, init) => {
      calls++; active++;
      return new Response(new ReadableStream({ start(controller) { init.signal.addEventListener('abort', () => { active--; controller.error(new Error('abort')); }, { once: true }); } }));
    });
    await transport({ method: 'eth_chainId' }); return successful();
  });
  const results = await Promise.all(Array.from({ length: 5 }, () => provider.getTokenSnapshot()));
  assert.ok(results.every((result) => result.diagnosticCode === 'TIMEOUT')); assert.equal(active, 0); assert.equal(calls, 1);
});
test('transport rejects write RPC methods before fetch', async () => {
  const transport = createTransport(31337, 'fixture', 'fixture', new AbortController().signal, () => { throw new Error('must not fetch'); });
  for (const method of ['eth_sendRawTransaction', 'eth_sendTransaction', 'personal_sign', 'eth_sign', 'wallet_sendCalls']) await assert.rejects(transport({ method }), { code: 'BAD_RESPONSE' });
});
test('transport refuses redirects, hides provider errors, checks response ID and bounds body size', async () => {
  const transport = createTransport(31337, 'fixture', 'fixture', new AbortController().signal, async (_url, init) => {
    assert.equal(init.redirect, 'error'); return new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, error: { code: -32000, message: 'SECRET https://private.test' } }));
  });
  await assert.rejects(transport({ method: 'eth_call' }), (error) => error.message === 'METHOD_UNAVAILABLE');
  const bad = createTransport(31337, 'fixture', 'fixture', new AbortController().signal, async () => new Response('x'.repeat(262145)));
  await assert.rejects(bad({ method: 'eth_chainId' }), { code: 'BAD_RESPONSE' });
});

// Deterministic cache-age regressions; status reads must never probe the provider.
for (const partial of [false, true]) {
  test('idle ' + (partial ? 'partial' : 'fresh') + ' snapshot reaches TTL without inventing a failed refresh', async () => {
    const c = config(); let time = 100000; let calls = 0;
    const provider = new ThirdwebReadProvider(c, async () => {
      calls++; const result = successful(c);
      return partial ? { ...result, snapshot: 'partial', connection: 'degraded', diagnosticCode: 'PARTIAL_METADATA', data: { ...result.data, name: unavailable() } } : result;
    }, () => time);
    const first = await provider.getTokenSnapshot();
    time += c.ttlMs - 1;
    assert.equal((await provider.getTokenSnapshot()).snapshot, first.snapshot);
    time++;
    const stale = await provider.getReadStatus();
    assert.equal(stale.snapshot, 'stale'); assert.equal(stale.connection, 'degraded');
    assert.equal(stale.diagnosticCode, 'REFRESH_REQUIRED');
    assert.equal(stale.lastSuccessAt, first.lastSuccessAt);
    assert.equal(stale.lastAttemptAt, first.lastAttemptAt);
    assert.deepEqual(stale.data, first.data); assert.equal(calls, 1);
  });
  for (const equalLimits of [false, true]) {
    test('expires ' + (partial ? 'partial' : 'fresh') + ' at exact maximum age; equal limits=' + equalLimits, async () => {
      const c = config(); if (equalLimits) c.maxStaleMs = c.ttlMs;
      let time = 100000; let calls = 0;
      const provider = new ThirdwebReadProvider(c, async () => {
        calls++; const result = successful(c);
        return partial ? { ...result, snapshot: 'partial', connection: 'degraded', diagnosticCode: 'PARTIAL_METADATA', data: { ...result.data, name: unavailable() } } : result;
      }, () => time);
      const first = await provider.getTokenSnapshot();
      time += c.maxStaleMs - 1; assert.ok((await provider.getReadStatus()).data);
      for (const age of [c.maxStaleMs, c.maxStaleMs + 1]) {
        time = 100000 + age;
        const expired = await provider.getReadStatus();
        assert.equal(expired.snapshot, 'absent'); assert.equal(expired.connection, 'unavailable');
        assert.equal(expired.data, null); assert.equal(expired.block, null); assert.equal(expired.observedAt, null);
        assert.equal(expired.diagnosticCode, 'SNAPSHOT_EXPIRED');
        assert.equal(expired.lastSuccessAt, first.lastSuccessAt); assert.equal(expired.lastAttemptAt, first.lastAttemptAt);
      }
      assert.equal(calls, 1);
    });
  }
}
test('rate-limit evidence and original timestamps survive TTL and exact expiry during backoff', async () => {
  const c = config(); let time = 100000; let calls = 0;
  const provider = new ThirdwebReadProvider(c, async () => {
    if (++calls > 1) throw new ReadError('RATE_LIMITED', 600000);
    return successful(c);
  }, () => time);
  const first = await provider.getTokenSnapshot(); time += c.ttlMs;
  const failed = await provider.getTokenSnapshot();
  assert.equal(failed.snapshot, 'stale'); assert.equal(failed.diagnosticCode, 'RATE_LIMITED');
  assert.equal(failed.observedAt, first.observedAt); assert.equal(failed.lastSuccessAt, first.lastSuccessAt);
  for (const age of [c.maxStaleMs - 1, c.maxStaleMs, c.maxStaleMs + 1]) {
    time = 100000 + age; const result = await provider.getTokenSnapshot();
    assert.equal(result.snapshot, age < c.maxStaleMs ? 'stale' : 'absent');
    assert.equal(result.diagnosticCode, 'RATE_LIMITED');
    assert.equal(result.lastSuccessAt, first.lastSuccessAt); assert.equal(result.lastAttemptAt, failed.lastAttemptAt);
    if (age >= c.maxStaleMs) { assert.equal(result.data, null); assert.equal(result.block, null); assert.equal(result.observedAt, null); }
  }
  assert.equal(calls, 2);
  time = 100000 + c.ttlMs + 600000;
  await provider.getTokenSnapshot(); assert.equal(calls, 3);
});
for (const code of ['WRONG_CHAIN', 'NO_CONTRACT', 'REORG', 'PROVIDER_AUTH']) {
  test(code + ' discards a prior successful snapshot without erasing historical success', async () => {
    const c = config(); let time = 100000; let fail = false;
    const provider = new ThirdwebReadProvider(c, async () => { if (fail) throw new ReadError(code); return successful(c); }, () => time);
    const first = await provider.getTokenSnapshot(); fail = true; time += c.ttlMs;
    const result = await provider.getTokenSnapshot();
    assert.equal(result.snapshot, 'absent'); assert.equal(result.data, null); assert.equal(result.block, null); assert.equal(result.observedAt, null);
    assert.equal(result.diagnosticCode, code); assert.equal(result.lastSuccessAt, first.lastSuccessAt);
    assert.notEqual(result.lastAttemptAt, first.lastAttemptAt);
  });
}

test('idle partial snapshot beyond maximum age reports expiry rather than old field diagnostics', async () => {
  const c = config(); let time = 100000; let calls = 0;
  const provider = new ThirdwebReadProvider(c, async () => {
    calls++; const result = successful(c);
    return { ...result, snapshot: 'partial', connection: 'degraded', diagnosticCode: 'PARTIAL_METADATA', data: { ...result.data, name: unavailable() } };
  }, () => time);
  const first = await provider.getTokenSnapshot(); time += c.maxStaleMs + 1;
  const expired = await provider.getReadStatus();
  assert.equal(expired.snapshot, 'absent'); assert.equal(expired.data, null);
  assert.equal(expired.diagnosticCode, 'SNAPSHOT_EXPIRED');
  assert.equal(expired.lastSuccessAt, first.lastSuccessAt); assert.equal(expired.lastAttemptAt, first.lastAttemptAt);
  assert.equal(calls, 1);
});
