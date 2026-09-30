const { test } = require('node:test');
const assert = require('node:assert/strict');

// These identifiers are synthetic fixtures, NOT a deployment or network approval.
const address = `0x${'1'.repeat(40)}`;
const secretKey = 'offline-only-never-a-real-key';
const hash = `0x${'a'.repeat(64)}`;
const selectors = {
  name: '0x06fdde03', symbol: '0x95d89b41', decimals: '0x313ce567',
  totalSupply: '0x18160ddd', cap: '0x355274ea', paused: '0x5c975abb',
};
const observed = (value) => ({ status: 'observed', value });
const unavailable = { status: 'unavailable', value: null };
const unsupported = { status: 'unsupported', value: null };
const word = (value) => BigInt(value).toString(16).padStart(64, '0');
const uint = (value) => `0x${word(value)}`;
function text(value) {
  const bytes = Buffer.from(value, 'utf8');
  return `0x${word(32)}${word(bytes.length)}${bytes.toString('hex').padEnd(Math.ceil(bytes.length / 32) * 64, '0')}`;
}
function config(optionalReads = []) {
  return {
    source: 'thirdweb_testnet', enabled: true, valid: true, code: null,
    secretKey, timeoutMs: 1000, ttlMs: 30000, maxStaleMs: 120000,
    approval: {
      id: 31337, name: 'Synthetic test chain', contractAddress: address,
      explorerOrigin: 'https://explorer.example.test', optionalReads,
      approvalReference: 'UNIT_TEST_ONLY_NOT_NETWORK_APPROVAL',
    },
  };
}
function block(number = '0x7b', blockHash = hash) {
  return {
    number, hash: blockHash, timestamp: '0x64', parentHash: `0x${'b'.repeat(64)}`,
    nonce: '0x0000000000000000', sha3Uncles: `0x${'0'.repeat(64)}`,
    logsBloom: `0x${'0'.repeat(512)}`, transactionsRoot: `0x${'0'.repeat(64)}`,
    stateRoot: `0x${'0'.repeat(64)}`, receiptsRoot: `0x${'0'.repeat(64)}`,
    miner: address, difficulty: '0x0', totalDifficulty: '0x0', extraData: '0x',
    size: '0x1', gasLimit: '0x1c9c380', gasUsed: '0x0', baseFeePerGas: '0x1',
    transactions: [], uncles: [], mixHash: `0x${'0'.repeat(64)}`,
  };
}

// Only a genuinely unavailable SDK dependency blocks this suite. Connector import
// errors and assertion failures must fail, not masquerade as dependency skips.
test('offline readSdkSnapshot with installed thirdweb SDK', { concurrency: false, timeout: 10000 }, async (t) => {
  const originalFetch = global.fetch;
  const unexpected = [];
  const denyFetch = async () => {
    unexpected.push('fetch outside the JSON-RPC fixture');
    throw new Error('Offline SDK suite forbids egress');
  };
  global.fetch = denyFetch;
  t.after(() => {
    global.fetch = originalFetch;
    assert.deepEqual(unexpected, [], 'No unexpected fetch may be swallowed by the SDK');
  });

  try {
    require('thirdweb');
    require('thirdweb/rpc');
    require('thirdweb/utils');
  } catch (error) {
    if (!['MODULE_NOT_FOUND', 'ERR_MODULE_NOT_FOUND', 'ERR_PACKAGE_PATH_NOT_EXPORTED', 'ERR_REQUIRE_ESM'].includes(error.code)) throw error;
    t.skip(`BLOCKED: thirdweb 5.121.6 dependency unavailable/incomplete (${error.code}: ${error.message.split('\n')[0]}). Actual installed SDK validation pending; no SDK assertions ran.`);
    return;
  }
  // Like readonly.test.cjs, exercise the compiled production connector. Run the
  // normal package build first once the SDK is installed; never stub the SDK.
  const { readSdkSnapshot } = require('../dist/sdk-snapshot');

  async function withRpc(options, check) {
    const calls = [];
    const violations = [];
    const signal = new AbortController().signal;
    const height = options.height ?? '0x7b';
    const replies = {
      [selectors.name]: text('Synthetic Token'), [selectors.symbol]: text('SYN'),
      [selectors.decimals]: uint(6), [selectors.totalSupply]: uint(12345678901234567890123456n),
      [selectors.cap]: uint(99999999999999999999999999n), [selectors.paused]: uint(0),
      ...options.replies,
    };
    let blockReads = 0;
    global.fetch = async (input, init) => {
      try {
        const url = new URL(String(input));
        assert.equal(url.origin, 'https://31337.rpc.thirdweb.com');
        assert.equal(url.search, '');
        assert.equal(url.hash, '');
        assert.equal(init.method, 'POST');
        assert.equal(init.redirect, 'error');
        assert.equal(init.signal, signal);
        const headers = new Headers(init.headers);
        assert.equal(headers.get('x-secret-key'), secretKey);
        assert.ok(headers.get('x-client-id'));
        assert.equal(url.pathname, `/${encodeURIComponent(headers.get('x-client-id'))}`);
        const request = JSON.parse(init.body);
        assert.equal(request.jsonrpc, '2.0');
        assert.equal(request.id, calls.length + 1);
        calls.push(request);
        let result;
        switch (request.method) {
          case 'eth_chainId':
            assert.deepEqual(request.params, []);
            result = options.chainId ?? '0x7a69';
            break;
          case 'eth_getBlockByNumber':
            blockReads++;
            assert.deepEqual(request.params, [blockReads === 1 ? 'latest' : height, false]);
            assert.ok(blockReads <= 2);
            result = block(height, blockReads === 2 ? (options.confirmedHash ?? hash) : hash);
            break;
          case 'eth_getCode':
            assert.deepEqual(request.params, [address, height]);
            result = options.code ?? '0x60006000';
            break;
          case 'eth_call': {
            assert.equal(request.params.length, 2);
            assert.equal(request.params[1], height, 'Every token read must use the same explicit block height, including zero');
            assert.deepEqual(Object.keys(request.params[0]).sort(), ['data', 'to']);
            assert.equal(request.params[0].to, address);
            const selector = request.params[0].data;
            assert.ok(Object.values(selectors).includes(selector), 'Only reviewed read selectors are allowed');
            assert.ok(selector !== selectors.cap || options.optionalReads?.includes('cap'));
            assert.ok(selector !== selectors.paused || options.optionalReads?.includes('paused'));
            result = replies[selector];
            break;
          }
          default:
            assert.fail(`Forbidden RPC method: ${request.method}`);
        }
        const payload = result && typeof result === 'object' && 'error' in result
          ? { jsonrpc: '2.0', id: request.id, error: result.error }
          : { jsonrpc: '2.0', id: request.id, result };
        return new Response(JSON.stringify(payload), { headers: { 'content-type': 'application/json' } });
      } catch (error) {
        // Production deliberately sanitizes transport errors; retain fixture
        // assertion failures out-of-band so sanitization cannot hide them.
        violations.push(error.message);
        throw error;
      }
    };
    try {
      await check(() => readSdkSnapshot(config(options.optionalReads), signal), calls);
    } finally {
      global.fetch = denyFetch;
      assert.deepEqual(violations, [], 'Unexpected RPC request (no network fallback exists)');
    }
  }
  function assertSnapshot(result) {
    assert.equal(result.capability, 'read_only');
    assert.equal(result.restrictionAssessment, 'not_assessed');
    assert.equal(result.source, 'thirdweb_testnet');
    assert.equal(result.chain.id, 31337);
    assert.equal(result.contractAddress, address);
    assert.equal(result.block.finality, 'observed');
    assert.ok(!JSON.stringify(result).includes(secretKey));
  }
  function assertPartial(result) {
    assertSnapshot(result);
    assert.equal(result.snapshot, 'partial');
    assert.equal(result.connection, 'degraded');
    assert.equal(result.diagnosticCode, 'PARTIAL_METADATA');
  }

  await t.test('decodes strings and huge non-18 supply exactly; pinned observed block; no writes', async () => {
    await withRpc({}, async (read, calls) => {
      const result = await read();
      assertSnapshot(result);
      assert.equal(result.snapshot, 'fresh');
      assert.equal(result.connection, 'ready');
      assert.equal(result.diagnosticCode, null);
      assert.deepEqual(result.data.name, observed('Synthetic Token'));
      assert.deepEqual(result.data.symbol, observed('SYN'));
      assert.deepEqual(result.data.decimals, observed(6));
      assert.deepEqual(result.data.totalSupply, observed({ raw: '12345678901234567890123456', formatted: '12345678901234567890.123456' }));
      assert.deepEqual(result.data.cap, unsupported);
      assert.deepEqual(result.data.paused, unsupported);
      assert.deepEqual(result.block, { number: '123', hash, timestamp: '100', finality: 'observed' });
      assert.deepEqual(calls.map((call) => call.method), ['eth_chainId', 'eth_getBlockByNumber', 'eth_getCode', 'eth_call', 'eth_call', 'eth_call', 'eth_call', 'eth_getBlockByNumber']);
      assert.deepEqual(calls.filter((call) => call.method === 'eth_call').map((call) => call.params[0].data), [selectors.name, selectors.symbol, selectors.decimals, selectors.totalSupply]);
    });
  });
  for (const [decimals, amount, formatted] of [[0, 12n, '12'], [18, 1000000000000000001n, '1.000000000000000001'], [255, 1n, `0.${'0'.repeat(254)}1`]]) {
    await t.test(`formats supply at ${decimals} decimals without Number coercion`, async () => {
      await withRpc({ replies: { [selectors.decimals]: uint(decimals), [selectors.totalSupply]: uint(amount) } }, async (read) => {
        const result = await read();
        assert.deepEqual(result.data.totalSupply, observed({ raw: amount.toString(), formatted }));
      });
    });
  }
  await t.test('observed zero is not unknown supply', async () => {
    for (const [raw, expected] of [[uint(0), observed({ raw: '0', formatted: '0' })], ['0x', unavailable]]) {
      await withRpc({ replies: { [selectors.totalSupply]: raw } }, async (read) => {
        const result = await read();
        assert.deepEqual(result.data.totalSupply, expected);
        if (raw === '0x') assertPartial(result);
        else assert.equal(result.snapshot, 'fresh');
      });
    }
  });
  await t.test('unknown or out-of-range decimals preserve raw supply without inventing units', async () => {
    for (const raw of ['0x', uint(256), '0x01']) {
      await withRpc({ replies: { [selectors.decimals]: raw, [selectors.totalSupply]: uint(0) } }, async (read) => {
        const result = await read();
        assertPartial(result);
        assert.deepEqual(result.data.decimals, unavailable);
        assert.deepEqual(result.data.totalSupply, observed({ raw: '0', formatted: null }));
      });
    }
  });
  for (const paused of [true, false]) {
    await t.test(`approved cap and paused=${paused} are observed, not restriction assessments`, async () => {
      await withRpc({ optionalReads: ['cap', 'paused'], replies: { [selectors.paused]: uint(paused ? 1 : 0) } }, async (read) => {
        const result = await read();
        assertSnapshot(result);
        assert.equal(result.snapshot, 'fresh');
        assert.deepEqual(result.data.paused, observed(paused));
        assert.deepEqual(result.data.cap, observed({ raw: '99999999999999999999999999', formatted: '99999999999999999999.999999' }));
      });
    });
  }
  await t.test('approved optional reads that revert or return empty remain unavailable, never false/zero/unsupported', async () => {
    await withRpc({ optionalReads: ['cap', 'paused'], replies: {
      [selectors.cap]: { error: { code: -32000, message: 'execution reverted' } }, [selectors.paused]: '0x',
    } }, async (read) => {
      const result = await read();
      assertPartial(result);
      assert.deepEqual(result.data.cap, unavailable);
      assert.deepEqual(result.data.paused, unavailable);
      assert.deepEqual(result.data.name, observed('Synthetic Token'));
    });
  });
  await t.test('text is UTF-8 decoded, control/bidi stripped, bounded, and never fetched', async () => {
    await withRpc({ replies: {
      [selectors.name]: text(`\u0000\u202ehttps://untrusted.example.test/${'x'.repeat(300)}`),
      [selectors.symbol]: text('\u2066Tøkén\u0007'),
    } }, async (read) => {
      const result = await read();
      assert.deepEqual(result.data.name, observed(`https://untrusted.example.test/${'x'.repeat(300)}`.slice(0, 120)));
      assert.deepEqual(result.data.symbol, observed('Tøkén'));
    });
  });
  await t.test('one malformed ABI field yields a partial snapshot without losing valid fields', async () => {
    await withRpc({ replies: { [selectors.name]: '0x01' } }, async (read) => {
      const result = await read();
      assertPartial(result);
      assert.deepEqual(result.data.name, unavailable);
      assert.deepEqual(result.data.symbol, observed('SYN'));
      assert.equal(result.data.totalSupply.status, 'observed');
    });
  });
  await t.test('no observed metadata fails instead of reporting a successful empty snapshot', async () => {
    await withRpc({ replies: Object.fromEntries(Object.values(selectors).map((selector) => [selector, '0x'])) }, async (read) => {
      await assert.rejects(read(), { code: 'PROVIDER_UNAVAILABLE' });
    });
  });
  await t.test('wrong chain stops before code or token calls', async () => {
    await withRpc({ chainId: '0x1' }, async (read, calls) => {
      await assert.rejects(read(), { code: 'WRONG_CHAIN' });
      assert.deepEqual(calls.map((call) => call.method), ['eth_chainId']);
    });
  });
  for (const code of ['0x', '0x00']) {
    await t.test(`absent contract code ${code} stops before token calls`, async () => {
      await withRpc({ code }, async (read, calls) => {
        await assert.rejects(read(), { code: 'NO_CONTRACT' });
        assert.deepEqual(calls.map((call) => call.method), ['eth_chainId', 'eth_getBlockByNumber', 'eth_getCode']);
      });
    });
  }
  await t.test('changed block hash discards the entire snapshot', async () => {
    await withRpc({ confirmedHash: `0x${'c'.repeat(64)}` }, async (read) => {
      await assert.rejects(read(), { code: 'REORG' });
    });
  });
  await t.test('genesis height zero stays pinned for token calls and confirmation', async () => {
    await withRpc({ height: '0x0' }, async (read) => {
      const result = await read();
      assertSnapshot(result);
      assert.equal(result.block.number, '0');
    });
  });
});
