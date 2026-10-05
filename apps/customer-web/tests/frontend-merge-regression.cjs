const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const ts = require('typescript');
const root = path.resolve(__dirname, '../../..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const compiled = ts.transpileModule(read('apps/admin-web/app/capability-scopes.ts'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const scopeModule = { exports: {} };
new Function('exports', 'require', 'module', compiled)(scopeModule.exports, name => {
  throw new Error('Pure capability module unexpectedly imported ' + name);
}, scopeModule);
const scopes = scopeModule.exports;
const globalGrant = { company_id: null, project_id: null };
const scopedGrant = { company_id: 'company-a', project_id: 'project-a' };

for (const [label, grants, permitted] of [
  ['global only', [globalGrant], true],
  ['mixed global/scoped', [scopedGrant, globalGrant], true],
  ['scoped only', [scopedGrant], false],
  ['missing', undefined, false],
  ['empty', [], false],
  ['malformed', [{}], false],
]) {
  test('server-wide integration read checks explicit grants: ' + label, () => {
    const capabilities = { permissions: ['integration.view'], grants: { 'integration.view': grants } };
    assert.equal(scopes.hasEffectiveGrant(capabilities, 'integration.view', scopes.globalScope(), false), permitted);
  });
}

test('global rights on another permission do not authorize integration reads', () => {
  assert.equal(scopes.hasEffectiveGrant({ permissions: ['integration.view', 'company.view'], grants: {
    'integration.view': [scopedGrant], 'company.view': [globalGrant],
  } }, 'integration.view', scopes.globalScope(), false), false);
});

test('main mutation scope and multi-permission checks remain intact', () => {
  assert.equal(scopes.grantCoversTarget(scopedGrant, { company_id: 'company-a', project_id: 'project-b' }), false);
  assert.equal(scopes.grantCoversTarget(globalGrant, scopedGrant), true);
  assert.deepEqual(scopes.requiredMutationPermissions('properties', 'edit', { status: 'SOLD' }), ['property.edit', 'property.change_status']);
  assert.equal(scopes.hasRequiredMutationGrants({ permissions: [], grants: {}, mutation_grants: {
    'property.edit': [globalGrant],
  } }, ['property.edit', 'property.change_status'], scopedGrant), false);
});

test('public verifier uses bounded anonymous transport and never fabricates sharing tokens', () => {
  const verifier = read('apps/customer-web/app/verify/rhc-id/[token]/page.tsx');
  assert.ok(verifier.includes('publicRequest<VerificationResult>'));
  assert.equal(verifier.includes('fetch('), false);
  assert.ok(verifier.includes("data.status === 'UNAVAILABLE'"));
  assert.ok(verifier.includes('controller.abort()'));
  assert.ok(verifier.includes('key={[token, dataMode, dataRevision]'));
  const identity = read('apps/customer-web/app/components/digital-id-page.tsx');
  assert.ok(identity.includes('id.data?.public_reference || null'));
  assert.equal(identity.includes('btoa('), false);
});

test('test servers and browser boundary exclude original app ports', () => {
  for (const app of ['customer', 'admin']) {
    const config = read('apps/' + app + '-web/playwright.config.ts');
    assert.ok(config.includes('reuseExistingServer: false'));
    assert.ok(config.includes("serviceWorkers: 'block'"));
    assert.ok(config.includes(app === 'customer' ? '43102' : '43103'));
    assert.ok(config.includes('offline-network.cjs'));
    assert.equal(config.includes('run-safe.cjs'), false);
    assert.ok(config.includes('NODE_OPTIONS: guardedNodeOptions')); 
    assert.equal(config.includes('npm run start'), false);
  }
  const fixtures = read('apps/customer-web/tests/fixtures.ts');
  assert.equal(fixtures.includes(':3002'), false);
  assert.equal(fixtures.includes(':3003'), false);
  assert.ok(read('apps/customer-web/tests/offline-test.ts').includes("route.abort('blockedbyclient')"));
});

test('frontend TypeScript sources parse without conflicts', () => {
  let count = 0;
  function walk(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (['node_modules', '.next', 'test-results', 'playwright-report'].includes(entry.name)) continue;
      const filename = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(filename);
      else if (filename.endsWith('.ts') || filename.endsWith('.tsx')) {
        count += 1;
        const text = fs.readFileSync(filename, 'utf8');
        assert.equal(text.split(String.fromCharCode(10)).some(line => line.startsWith('<<<<<<< ') || line.startsWith('>>>>>>> ')), false, filename);
        const source = ts.createSourceFile(filename, text, ts.ScriptTarget.Latest, true);
        assert.deepEqual(source.parseDiagnostics.map(item => ts.flattenDiagnosticMessageText(item.messageText, ' ')), [], filename);
      }
    }
  }
  walk(path.join(root, 'apps/customer-web'));
  walk(path.join(root, 'apps/admin-web'));
  assert.ok(count >= 130);
});
