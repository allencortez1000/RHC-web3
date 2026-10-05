const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const sourceRoot = path.resolve(__dirname, '../src') + path.sep;
const previousLoader = require.extensions['.ts'];
require.extensions['.ts'] = (module, filename) => {
  if (!filename.startsWith(sourceRoot)) {
    if (previousLoader) return previousLoader(module, filename);
    throw new Error('Unexpected source outside UI');
  }
  const result = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    fileName: filename, reportDiagnostics: true,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  });
  assert.equal(result.diagnostics?.length ?? 0, 0);
  module._compile(result.outputText, filename);
};
const { RequestScope } = require('../src/request-scope.ts');
const { ApiError, apiRequestUrl } = require('../src/api-transport.ts');
const { assertRequestAvailable } = require('../src/api-capabilities.ts');
const file = path.join(sourceRoot, 'runtime.tsx');
const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const declaration = source.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === 'PortalProvider');
assert.ok(declaration);
const compiled = ts.transpileModule(declaration.getText(source).replace('export function', 'function'), {
  fileName: file, reportDiagnostics: true,
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, jsxFactory: 'h' },
});
assert.equal(compiled.diagnostics?.length ?? 0, 0);
const accountA = { access_token: 'synthetic-a', user: { id: 'account-a' } };
const accountB = { access_token: 'synthetic-b', user: { id: 'account-b' } };
const tick = () => new Promise((resolve) => setImmediate(resolve));
function deferred() { let resolve; const promise = new Promise((done) => { resolve = done; }); return { promise, resolve }; }

// A minimal deterministic hook driver for the real provider declaration. No React DOM,
// app imports, server, build output or network is used; effects/cleanup remain explicit.
async function harness(response, logout) {
  const slots = []; let cursor = 0; const effects = []; const subscribers = new Set();
  const navigation = []; let session = accountA;
  const same = (a, b) => a?.length === b?.length && a.every((value, i) => Object.is(value, b[i]));
  const useMemo = (work, deps) => {
    const i = cursor++;
    if (!slots[i] || !same(slots[i].deps, deps)) slots[i] = { deps, value: work() };
    return slots[i].value;
  };
  const auth = {
    mode: 'api', session: async () => session,
    subscribe(callback) { subscribers.add(callback); return () => subscribers.delete(callback); },
    logout: logout || (async () => emit(null)),
  };
  function emit(next) { session = next; for (const callback of subscribers) callback(next); }
  const Provider = vm.runInNewContext(compiled.outputText + String.fromCharCode(10) + 'PortalProvider', {
    RequestScope, ApiError, apiRequestUrl, assertRequestAvailable,
    fetchApiResponse: (...args) => response(emit, ...args),
    AbortController, DOMException, Headers,
    RuntimeContext: { Provider: 'provider' }, SignOutButton: 'signout', DemoEnvironmentControls: 'demo',
    h: (type, props, ...children) => ({ type, props, children }),
    errorMessage: (error) => error.message,
    useMemo, useCallback: (work, deps) => useMemo(() => work, deps),
    useRef(initial) { const i = cursor++; return slots[i] ||= { current: initial }; },
    useState(initial) {
      const i = cursor++; slots[i] ||= { value: initial };
      return [slots[i].value, (next) => { slots[i].value = typeof next === 'function' ? next(slots[i].value) : next; }];
    },
    useEffect(work, deps) {
      const i = cursor++;
      if (!slots[i] || !same(slots[i].deps, deps)) {
        slots[i]?.cleanup?.(); slots[i] = { deps };
        effects.push(() => { slots[i].cleanup = work(); });
      }
    },
  });
  const navigate = (url) => navigation.push(url);
  const publicRoutes = ['/public'];
  function render() {
    cursor = 0;
    const element = Provider({ auth, apiUrl: 'https://api.example.test', pathname: '/public', publicRoutes, navigate, children: null });
    while (effects.length) effects.shift()();
    return element.props.value;
  }
  render(); await tick(); render();
  return { render, emit, auth, navigation, dispose() { for (const slot of slots) slot?.cleanup?.(); } };
}


test('session switch at response completion rejects old success without a mutation revision', async () => {
  const app = await harness(async (emit) => { emit(accountB); return { data: { id: 'old-account-record' } }; });
  try {
    const before = app.render().dataRevision;
    await assert.rejects(app.render().request('/records', { method: 'POST' }), { name: 'AbortError' });
    assert.equal(app.render().dataRevision, before + 1, 'Only the session transition may increment revision');
    assert.equal(app.render().hasSession, true);
  } finally { app.dispose(); }
});

test('session switch at failed response completion does not let an old 401 clear the new session', async () => {
  const app = await harness(async (emit) => { emit(accountB); throw new ApiError(401, 'Old session rejected', 'OLD_SESSION'); });
  try {
    await assert.rejects(app.render().request('/records'), { name: 'AbortError' });
    assert.equal(app.render().hasSession, true, 'The replacement session must survive');
  } finally { app.dispose(); }
});

test('a current 401 still clears the current session and preserves server error metadata', async () => {
  const app = await harness(async () => { throw new ApiError(401, 'Current session rejected', 'SESSION_EXPIRED', 'request-test'); });
  try {
    await assert.rejects(app.render().request('/records'), { status: 401, code: 'SESSION_EXPIRED', requestId: 'request-test' });
    assert.equal(app.render().hasSession, false);
  } finally { app.dispose(); }
});

test('logout clears visible session immediately while provider cleanup remains pending', async () => {
  const cleanup = deferred();
  const app = await harness(async () => { throw new Error('Unexpected request'); }, () => cleanup.promise);
  try {
    const pending = app.render().logout();
    assert.equal(app.render().hasSession, false, 'Public-route consumers must stop mounting authenticated reads immediately');
    cleanup.resolve(); await pending;
    assert.deepEqual(app.navigation, ['/login']);
  } finally { cleanup.resolve(); await tick(); app.dispose(); }
});


test('same-session refocus does not cancel a valid request or cause an extra revision', async () => {
  const app = await harness(async (emit) => { emit(accountA); return { data: { id: 'current-record' } }; });
  try {
    const before = app.render().dataRevision;
    assert.deepEqual(await app.render().request('/records', { method: 'POST' }), { id: 'current-record' });
    assert.equal(app.render().dataRevision, before + 1);
    assert.equal(app.render().hasSession, true);
  } finally { app.dispose(); }
});

test('missing adapter session remains a genuine 401 rather than self-cancelling its cleanup', async () => {
  const app = await harness(async () => { assert.fail('No request without a session'); });
  try {
    app.auth.session = async () => null;
    await assert.rejects(app.render().request('/records'), { status: 401, code: 'SESSION_REQUIRED' });
    assert.equal(app.render().hasSession, false);
  } finally { app.dispose(); }
});

test('profile-scope cancellation rejects public responses at the helper continuation boundary', async () => {
  for (const fail of [false, true]) {
    const app = await harness(async (emit) => {
      emit(accountB);
      if (fail) throw new ApiError(403, 'Old profile error');
      return { data: { id: 'old-profile-record' } };
    });
    try {
      await assert.rejects(app.render().publicRequest('/properties'), { name: 'AbortError' });
      assert.equal(app.render().hasSession, true);
    } finally { app.dispose(); }
  }
});

test('provider logout failure stays rejected after immediate local session cleanup', async () => {
  const cleanup = deferred();
  const app = await harness(async () => { assert.fail('Unexpected request'); }, async () => { await cleanup.promise; throw new Error('Provider cleanup failed'); });
  try {
    const pending = app.render().logout();
    assert.equal(app.render().hasSession, false);
    cleanup.resolve();
    await assert.rejects(pending, /Provider cleanup failed/);
    assert.equal(app.render().hasSession, false);
    assert.deepEqual(app.navigation, ['/login']);
  } finally { cleanup.resolve(); await tick(); app.dispose(); }
});
