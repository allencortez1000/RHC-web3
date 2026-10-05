const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const sourceRoot = path.resolve(__dirname, '../src') + path.sep;
const previousLoader = require.extensions['.ts'];
require.extensions['.ts'] = (module, filename) => {
  if (!filename.startsWith(sourceRoot)) {
    if (previousLoader) return previousLoader(module, filename);
    throw new Error('Unexpected TypeScript source outside UI');
  }
  const result = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    fileName: filename,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    reportDiagnostics: true,
  });
  assert.equal(result.diagnostics?.length ?? 0, 0, 'Transpile diagnostics for ' + filename);
  module._compile(result.outputText, filename);
};
const { ApiError, apiRequestUrl, publicApiRequest, fetchApiResponse } = require('../src/api-transport.ts');
const { RequestScope } = require('../src/request-scope.ts');

// Every fetch is intercepted in-process. Never run this suite against a live API.
async function withFetch(fetcher, run) {
  const original = global.fetch;
  global.fetch = fetcher;
  try { await run(); } finally { global.fetch = original; }
}

test('public requests unwrap data and omit supplied auth, cookies, redirects, and caching', async () => {
  await withFetch(async (url, init) => {
    assert.equal(url, 'https://api.example.test/auth/config');
    assert.equal(init.headers.has('authorization'), false);
    assert.equal(init.credentials, 'omit');
    assert.equal(init.redirect, 'error');
    assert.equal(init.cache, 'no-store');
    return Response.json({ success: true, data: { registration_enabled: false } });
  }, async () => {
    assert.deepEqual(await publicApiRequest('https://api.example.test', '/auth/config', {
      headers: { Authorization: 'Bearer must-not-leave-browser' }, credentials: 'include', redirect: 'follow',
    }), { registration_enabled: false });
  });
});

test('HTTP errors retain status, code and request ID rather than becoming empty records', async () => {
  await withFetch(async () => Response.json({ success: false, error: { code: 'FEATURE_DISABLED', message: 'Feature disabled' }, meta: { request_id: 'request-fixture' } }, { status: 403 }), async () => {
    await assert.rejects(publicApiRequest('https://api.example.test', '/properties'), (error) => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.status, 403); assert.equal(error.code, 'FEATURE_DISABLED'); assert.equal(error.requestId, 'request-fixture');
      assert.match(error.message, /permission/); return true;
    });
  });
});

test('failed envelopes and malformed success bodies never become success', async () => {
  for (const body of ['not JSON', 'null', JSON.stringify({ success: true }), JSON.stringify({ success: false, error: { code: 'FAILED', message: 'Rejected' } })]) {
    await withFetch(async () => new Response(body), async () => {
      await assert.rejects(publicApiRequest('https://api.example.test', '/records'), ApiError);
    });
  }
});

test('raw legacy JSON and explicit no-content responses remain supported', async () => {
  await withFetch(async () => Response.json([]), async () => {
    assert.deepEqual(await publicApiRequest('https://api.example.test', '/records'), []);
  });
  await withFetch(async () => new Response(null, { status: 204 }), async () => {
    assert.equal(await publicApiRequest('https://api.example.test', '/records', { method: 'DELETE' }), undefined);
  });
});

test('network failures reject without fixture or zero substitution', async () => {
  await withFetch(async () => { throw new TypeError('offline fixture'); }, async () => {
    await assert.rejects(publicApiRequest('https://api.example.test', '/records'), TypeError);
  });
});

test('pre-aborted public reads do not fetch', async () => {
  const controller = new AbortController(); controller.abort();
  await withFetch(async () => { assert.fail('Unexpected fetch'); }, async () => {
    await assert.rejects(publicApiRequest('https://api.example.test', '/records', { signal: controller.signal }), { name: 'AbortError' });
  });
});

test('scope invalidation rejects pending session work and isolates other scopes', async () => {
  const scope = new RequestScope(); const pending = scope.open();
  const other = new RequestScope().open();
  try {
    const waiting = pending.wait(new Promise(() => {}));
    scope.invalidate();
    await assert.rejects(waiting, { name: 'AbortError' });
    assert.equal(other.signal.aborted, false);
  } finally { pending.close(); other.close(); }
});

test('deadline covers a non-cooperating response body, not only response headers', async () => {
  await withFetch(async () => ({ ok: true, status: 200, headers: new Headers(), json: () => new Promise(() => {}) }), async () => {
    const pending = new RequestScope().open(undefined, 20);
    try {
      await assert.rejects(fetchApiResponse('https://api.example.test/records', {}, pending), { name: 'TimeoutError' });
      assert.equal(pending.signal.aborted, true);
    } finally { pending.close(); }
  });
});


test('URL validation preserves base paths and rejects ambiguous paths and unsafe bases', () => {
  assert.equal(apiRequestUrl('https://api.example.test/api/v1/', '/properties'), 'https://api.example.test/api/v1/properties');
  assert.equal(apiRequestUrl('https://api.example.test/api/v1', '/properties'), 'https://api.example.test/api/v1/properties');
  for (const invalidPath of ['properties', '//other.example.test', '/' + String.fromCharCode(92) + 'other.example.test']) {
    assert.throws(() => apiRequestUrl('https://api.example.test', invalidPath), /Invalid API path/);
  }
  for (const invalidBase of ['file:///tmp/api', 'https://user:password@example.test', 'https://api.example.test?query=1', 'https://api.example.test#fragment']) {
    assert.throws(() => apiRequestUrl(invalidBase, '/properties'), /Invalid API URL/);
  }
});
