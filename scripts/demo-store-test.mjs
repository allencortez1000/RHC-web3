import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(import.meta.url);
const sourceFiles = {
  types: path.join(root, 'packages/types/src/demo.ts'),
  seed: path.join(root, 'apps/customer-web/app/lib/demo/seed.ts'),
  store: path.join(root, 'apps/customer-web/app/lib/demo/store.ts'),
  router: path.join(root, 'apps/customer-web/app/lib/demo/router.ts'),
  route: path.join(root, 'apps/customer-web/app/api/demo/[...segments]/route.ts'),
};
const compiled = new Map();
for (const [name, fileName] of Object.entries(sourceFiles)) {
  const result = ts.transpileModule(await fs.readFile(fileName, 'utf8'), {
    fileName,
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
      esModuleInterop: true,
    },
    reportDiagnostics: true,
  });
  assert.equal(result.diagnostics?.length ?? 0, 0, `Transpile diagnostics for ${fileName}`);
  compiled.set(name, result.outputText);
}

function evaluate(name, dependencies = {}) {
  const module = { exports: {} };
  const localRequire = (specifier) => {
    if (Object.hasOwn(dependencies, specifier)) return dependencies[specifier];
    if (specifier === './seed') return evaluate('seed').exports;
    if (specifier === '@rhc/types') return evaluate('types').exports;
    return require(specifier);
  };
  const fn = new Function(
    'exports',
    'require',
    'module',
    '__filename',
    '__dirname',
    compiled.get(name),
  );
  fn(module.exports, localRequire, module, sourceFiles[name], path.dirname(sourceFiles[name]));
  return module;
}

async function withStore(callback) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'rhc-demo-store-'));
  const previous = {
    directory: process.env.RHC_DEMO_STORE_DIR,
    mode: process.env.RHC_DEMO_MODE,
    profile: process.env.RHC_APP_PROFILE,
    nodeEnv: process.env.NODE_ENV,
    environment: process.env.RHC_ENVIRONMENT,
    appEnv: process.env.APP_ENV,
    vercel: process.env.VERCEL_ENV,
  };
  process.env.RHC_DEMO_STORE_DIR = directory;
  process.env.RHC_DEMO_MODE = '1';
  process.env.RHC_APP_PROFILE = 'demo';
  process.env.NODE_ENV = 'test';
  delete process.env.RHC_ENVIRONMENT;
  delete process.env.APP_ENV;
  delete process.env.VERCEL_ENV;
  try {
    return await callback({ directory, storeFile: path.join(directory, 'world.json') });
  } finally {
    for (const [key, value] of Object.entries({
      RHC_DEMO_STORE_DIR: previous.directory,
      RHC_DEMO_MODE: previous.mode,
      RHC_APP_PROFILE: previous.profile,
      NODE_ENV: previous.nodeEnv,
      RHC_ENVIRONMENT: previous.environment,
      APP_ENV: previous.appEnv,
      VERCEL_ENV: previous.vercel,
    })) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    await fs.rm(directory, { recursive: true, force: true });
  }
}

function storeApi() {
  return evaluate('store').exports;
}

async function filesIn(directory, prefix) {
  return (await fs.readdir(directory)).filter((entry) => entry.startsWith(prefix));
}

test('initializes a missing store once and persists mutations across module evaluation', async () => {
  await withStore(async ({ directory, storeFile }) => {
    const first = storeApi();
    const initial = await first.readDemoWorld();
    assert.equal(initial.provenance, 'DEMO');
    assert.equal(initial.revision, 1);
    assert.equal(await fs.stat(storeFile).then((entry) => entry.isFile()), true);

    const changed = await first.mutateDemoWorld((world) => {
      world.controls.latency_ms = 25;
      return world.controls.latency_ms;
    }, initial.revision);
    assert.equal(changed.result, 25);
    assert.equal(changed.world.revision, 2);

    const second = storeApi();
    const reloaded = await second.readDemoWorld();
    assert.equal(reloaded.controls.latency_ms, 25);
    assert.equal(reloaded.revision, 2);
    assert.equal((await filesIn(directory, 'world.invalid-')).length, 0);
  });
});

test('preserves malformed and unsupported bytes until an explicit confirmed reset', async () => {
  await withStore(async ({ directory, storeFile }) => {
    await fs.writeFile(storeFile, '{not-json\n', 'utf8');
    const api = storeApi();
    await assert.rejects(
      api.readDemoWorld(),
      (error) => error?.code === 'STORE_INVALID_JSON' && error?.status === 503,
    );
    assert.equal(await fs.readFile(storeFile, 'utf8'), '{not-json\n');
    assert.equal((await filesIn(directory, 'world.backup-')).length, 0);

    await assert.rejects(
      api.resetDemoWorld('wrong'),
      (error) => error?.code === 'RESET_CONFIRMATION_REQUIRED',
    );
    assert.equal(await fs.readFile(storeFile, 'utf8'), '{not-json\n');

    const reset = await api.resetDemoWorld('RESET RHC DEMO');
    assert.equal(reset.provenance, 'DEMO');
    assert.equal(reset.revision, 1);
    assert.equal((await filesIn(directory, 'world.backup-')).length, 1);
    assert.match(await fs.readFile(storeFile, 'utf8'), /"schema_version": 1/);

    const unsupported = JSON.stringify({ schema_version: 99, provenance: 'DEMO' });
    await fs.writeFile(storeFile, unsupported, 'utf8');
    const reloaded = storeApi();
    await assert.rejects(reloaded.readDemoWorld(), (error) => error?.code === 'STORE_UNSUPPORTED');
    assert.equal(await fs.readFile(storeFile, 'utf8'), unsupported);
  });
});

test('does not commit a failed mutation or silently reseed a missing initialized store', async () => {
  await withStore(async ({ storeFile }) => {
    const api = storeApi();
    await api.readDemoWorld();
    await fs.unlink(storeFile);
    await assert.rejects(
      api.mutateDemoWorld((world) => {
        world.controls.scenario = 'empty';
        return null;
      }),
      (error) => error?.code === 'STORE_MISSING',
    );
    assert.equal(
      await fs.access(storeFile).then(
        () => false,
        () => true,
      ),
      true,
    );
  });
});

test('serializes one-shot failures so exactly one concurrent request consumes the control', async () => {
  await withStore(async () => {
    const api = storeApi();
    const initial = await api.readDemoWorld();
    await api.mutateDemoWorld((world) => {
      world.controls.fail_next_request = true;
      return null;
    }, initial.revision);
    const results = await Promise.allSettled([
      api.applyDemoRequestControls(),
      api.applyDemoRequestControls(),
    ]);
    assert.equal(results.filter((result) => result.status === 'rejected').length, 1);
    assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
    const after = await api.readDemoWorld();
    assert.equal(after.controls.fail_next_request, false);
  });
});

test('returns fresh seeded worlds instead of sharing nested fixture arrays', async () => {
  const seed = evaluate('seed').exports;
  const first = seed.createDemoWorld();
  const second = seed.createDemoWorld();
  first.users[0].profile.first_name = 'Changed only in one clone';
  first.properties[0].metadata.demo_data = false;
  first.audit_logs[0].changes.summary = 'Changed only in one clone';
  assert.equal(second.users[0].profile.first_name, 'Maya');
  assert.equal(second.properties[0].metadata.demo_data, true);
  assert.equal(second.audit_logs[0].changes.summary, 'Sanitized synthetic audit event.');
});

async function withRouter(callback) {
  return withStore(async (files) => {
    const store = storeApi();
    const router = evaluate('router', { './store': store }).exports;
    const tokens = {};
    for (const id of ['customer-maya', 'customer-noah', 'operator-amica', 'compliance-admin', 'system-admin', 'auditor']) {
      tokens[id] = (await store.createDemoSession(id)).token;
    }
    const call = async (route, persona = 'customer-maya', method = 'GET', body = {}, expectedRevision) => {
      const url = new URL(route, 'http://127.0.0.1:3002');
      return router.dispatchDemoRequest({ segments: url.pathname.slice(1).split('/'), url, method,
        token: tokens[persona] ?? null, body, expectedRevision });
    };
    await callback({ ...files, store, router, call, tokens });
  });
}

const rejectsCode = (promise, code) => assert.rejects(promise, (error) => error?.code === code);
const credit = (key, points = 400, customer_id = 'usr-customer-001') => ({ customer_id, points,
  source: 'Offline qualifying event', reason: 'Synthetic evidence', rule_version: 'DEMO-RULE-1.0', idempotency_key: key });

test('reward commands isolate customers/actions, reject changed retries, and preserve one debit', async () => {
  await withRouter(async ({ call, store }) => {
    const before = await store.readDemoWorld();
    const body = { benefit_id: 'benefit-001', idempotency_key: 'same-key' };
    const first = (await call('/me/rewards/redeem', 'customer-maya', 'POST', body)).data;
    await rejectsCode(call('/me/rewards/redeem', 'customer-noah', 'POST', body), 'INSUFFICIENT_POINTS');
    const repeat = (await call('/me/rewards/redeem', 'customer-maya', 'POST', body)).data;
    assert.equal(repeat.entry.id, first.entry.id);
    assert.equal(repeat.duplicate, true);
    await rejectsCode(call('/me/rewards/redeem', 'customer-maya', 'POST', { ...body, benefit_id: 'benefit-002' }), 'IDEMPOTENCY_CONFLICT');
    const credited = (await call('/admin/rewards-ledger/credit', 'system-admin', 'POST', credit('same-key'))).data;
    assert.notEqual(credited.entry.id, first.entry.id);
    await rejectsCode(call('/admin/rewards-ledger/credit', 'system-admin', 'POST', credit('same-key', 401)), 'IDEMPOTENCY_CONFLICT');
    const after = await store.readDemoWorld();
    assert.equal(after.reward_entries.length, before.reward_entries.length + 2);
    assert.equal(after.redemptions.length, before.redemptions.length + 1);
    assert.equal(after.audit_logs.filter((row) => ['BENEFIT_REDEEMED', 'REWARD_CREDIT_POSTED'].includes(row.action)).length, 2);
  });
});

test('confirmed customer cancellation releases inventory and records the actual previous state', async () => {
  await withRouter(async ({ call, store }) => {
    const world = await store.readDemoWorld();
    const property = world.properties.find((row) => row.status === 'AVAILABLE');
    const reservation = (await call('/me/reservations', 'customer-maya', 'POST', { property_id: property.id })).data;
    await call(`/admin/reservations/${reservation.id}/confirm`, 'operator-amica', 'POST');
    await call(`/me/reservations/${reservation.id}/cancel`, 'customer-maya', 'POST');
    const after = await store.readDemoWorld();
    assert.equal(after.properties.find((row) => row.id === reservation.property_id).status, 'AVAILABLE');
    assert.equal(after.audit_logs[0].changes.previous_status, 'CONFIRMED');
  });
});

test('a posted payment can have only one append-only reversal', async () => {
  await withRouter(async ({ call, store }) => {
    const original = (await store.readDemoWorld()).payments.find((row) => row.status === 'POSTED');
    await call(`/admin/payments/${original.id}/reverse`, 'system-admin', 'POST', { reason: 'Offline correction' });
    await rejectsCode(call(`/admin/payments/${original.id}/reverse`, 'system-admin', 'POST', { reason: 'Repeated correction' }), 'PAYMENT_ALREADY_REVERSED');
    const after = await store.readDemoWorld();
    assert.deepEqual(after.payments.find((row) => row.id === original.id), original);
    assert.equal(after.payments.filter((row) => row.reversed_from_id === original.id).length, 1);
  });
});

test('credential shortcuts reject non-string credentials without creating sessions', async () => {
  await withRouter(async ({ call, store }) => {
    const before = await store.readDemoWorld();
    await rejectsCode(call('/session/credentials', null, 'POST', { email: ['demo@rhc.local'], password: ['Demo123456!'] }), 'INVALID_DEMO_CREDENTIALS');
    assert.equal((await store.readDemoWorld()).revision, before.revision);
    const valid = await call('/session/credentials', null, 'POST', { email: ' DEMO@RHC.LOCAL ', password: 'Demo123456!' });
    assert.equal(valid.data.target, 'customer');
  });
});

test('disabled accounts cannot reuse or create a persona session', async () => {
  await withRouter(async ({ call, store, tokens }) => {
    await call('/admin/users/usr-customer-001/status', 'system-admin', 'PATCH', { account_status: 'DISABLED', expected_status: 'ACTIVE' });
    await rejectsCode(store.authenticateDemoSession(tokens['customer-maya']), 'ACCOUNT_INACTIVE');
    await rejectsCode(store.createDemoSession('customer-maya'), 'ACCOUNT_INACTIVE');
  });
});

test('public verification derives expiry without leaking private customer fields', async () => {
  await withRouter(async ({ call, store }) => {
    await store.mutateDemoWorld((world) => {
      world.certificates[0].expires_at = '2026-01-01T00:00:00.000Z';
      world.certificates[0].status = 'ACTIVE';
    });
    const world = await store.readDemoWorld();
    const result = (await call(`/verify/rhc-id/${world.certificates[0].public_reference}`, null)).data;
    assert.equal(result.valid, false);
    assert.equal(result.status, 'EXPIRED');
    const serialized = JSON.stringify(result);
    for (const field of ['email', 'mobile_number', 'address_line', 'birth_date', 'content']) assert.equal(Object.hasOwn(result, field), false);
    assert.equal(serialized.includes('Maya Santos'), false);
  });
});

test('scoped staff cannot bypass catalog scope through customer catalog routes', async () => {
  await withRouter(async ({ call }) => {
    for (const resource of ['companies', 'projects', 'properties', 'business-services']) {
      const scoped = (await call(`/admin/${resource}`, 'operator-amica')).data.map((row) => row.id).sort();
      const alternate = (await call(`/${resource}`, 'operator-amica')).data.map((row) => row.id).sort();
      assert.deepEqual(alternate, scoped, resource);
    }
  });
});

test('posted ledger totals ignore pending/reversed/expired entries and concurrent redemption cannot overspend', async () => {
  await withRouter(async ({ call, store }) => {
    await store.mutateDemoWorld((world) => {
      world.reward_entries = ['POSTED', 'PENDING', 'REVERSED', 'EXPIRED'].map((status, index) => ({
        ...world.reward_entries[0], id: `test-reward-${index}`, status, points: index === 0 ? 300 : 10000, idempotency_key: `fixture-${index}`,
      }));
    });
    const initial = (await call('/me/demo-records')).data.rewards;
    assert.equal(initial.balance, 300);
    assert.equal(initial.earned, 300);
    const results = await Promise.allSettled(['concurrent-a', 'concurrent-b'].map((key) => call('/me/rewards/redeem', 'customer-maya', 'POST', { benefit_id: 'benefit-001', idempotency_key: key })));
    assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
    assert.equal(results.find((result) => result.status === 'rejected').reason.code, 'INSUFFICIENT_POINTS');
    const after = (await call('/me/demo-records')).data.rewards;
    assert.equal(after.balance, 0);
    assert.equal(after.redeemed, 300);
    for (const method of ['PATCH', 'DELETE']) {
      await rejectsCode(call('/admin/rewards-ledger/test-reward-0', 'system-admin', method, { points: 999 }), 'RESOURCE_NOT_MUTABLE');
    }
    await rejectsCode(call('/me/rewards/redeem', 'customer-maya', 'POST', { benefit_id: 'benefit-001', idempotency_key: 'stale' }, 1), 'REVISION_CONFLICT');
  });
});

test('repeated concurrent credits append once and response objects cannot mutate persisted ledger state', async () => {
  await withRouter(async ({ call, store }) => {
    const before = await store.readDemoWorld();
    const results = await Promise.all([1, 2].map(() => call('/admin/rewards-ledger/credit', 'system-admin', 'POST', credit('concurrent-credit'))));
    assert.equal(results[0].data.entry.id, results[1].data.entry.id);
    assert.equal(results.filter((result) => result.data.duplicate).length, 1);
    results[0].data.entry.points = 99999;
    results[1].world.reward_entries[0].points = 99999;
    const after = await store.readDemoWorld();
    assert.equal(after.reward_entries.length, before.reward_entries.length + 1);
    assert.equal(after.reward_entries.at(-1).points, 400);
    assert.deepEqual(after.reward_entries.slice(0, -1), before.reward_entries);
    await store.mutateDemoWorld((world) => { world.reward_entries[0].points = Number.MAX_SAFE_INTEGER; });
    const revision = (await store.readDemoWorld()).revision;
    await rejectsCode(call('/admin/rewards-ledger/credit', 'system-admin', 'POST', credit('overflow')), 'POINTS_RANGE_EXCEEDED');
    assert.equal((await store.readDemoWorld()).revision, revision);
  });
});

test('sessions use wall-clock expiry, revoke on logout/reset, and revalidate queued mutations', async () => {
  await withRouter(async ({ call, store, tokens }) => {
    await call('/control', 'customer-maya', 'PATCH', { clock: '2099-01-01T00:00:00.000Z' });
    await store.authenticateDemoSession(tokens['customer-noah']);
    await store.mutateDemoWorld((world) => { world.sessions.find((row) => row.token === tokens['customer-noah']).expires_at = '2000-01-01T00:00:00.000Z'; });
    await rejectsCode(store.authenticateDemoSession(tokens['customer-noah']), 'SESSION_EXPIRED');
    await call('/session', 'customer-maya', 'DELETE');
    await rejectsCode(store.authenticateDemoSession(tokens['customer-maya']), 'SESSION_EXPIRED');
    await rejectsCode(store.withDemoRequestContext({ token: tokens['customer-maya'], requestId: 'revoked-request' }, () => store.mutateDemoWorld((world) => { world.controls.empty_state = true; })), 'SESSION_EXPIRED');
    await call('/reset', 'system-admin', 'POST', { confirmation: 'RESET RHC DEMO' });
    await rejectsCode(store.authenticateDemoSession(tokens['system-admin']), 'SESSION_EXPIRED');
  });
});

test('customer IDs and nested resource IDs cannot cross customer ownership', async () => {
  await withRouter(async ({ call, store }) => {
    const world = await store.readDemoWorld();
    const own = 'usr-customer-002';
    for (const route of ['/me/reservations', '/me/properties', '/me/notifications', '/me/receipts', '/me/service-requests', '/me/activity']) {
      const rows = (await call(`${route}?customer_id=usr-customer-001`, 'customer-noah')).data;
      assert.ok(rows.every((row) => row.customer_id === own), route);
    }
    const records = (await call('/me/demo-records', 'customer-noah')).data;
    assert.equal(records.payments.length, 0);
    assert.equal(records.rewards.balance, 0);
    assert.equal(records.milestones.length, 0);
    await rejectsCode(call('/me/notifications/notification-001/read', 'customer-noah', 'POST'), 'NOTIFICATION_NOT_FOUND');
    await rejectsCode(call('/me/reservations/reservation-001/cancel', 'customer-noah', 'POST'), 'RESERVATION_NOT_FOUND');
    await rejectsCode(call(`/me/documents/${world.documents[0].id}/versions`, 'customer-noah', 'POST', { content: 'Cross-customer version', idempotency_key: 'cross-document' }), 'DOCUMENT_NOT_FOUND');
    await rejectsCode(call('/me/payments', 'customer-noah', 'POST', { property_id: 'property-001', amount_minor: 1000, idempotency_key: 'cross-payment' }), 'PROPERTY_SCOPE_DENIED');
    await rejectsCode(call('/admin/customers', 'customer-noah'), 'ADMIN_REQUIRED');
  });
});

test('auditor denies writes across workflow families without changing durable records', async () => {
  await withRouter(async ({ call, store }) => {
    const before = await store.readDemoWorld();
    for (const [route, method] of [
      ['/control', 'PATCH'], ['/reset', 'POST'], ['/me', 'PATCH'], ['/me/rewards/redeem', 'POST'],
      ['/admin/rewards-ledger/credit', 'POST'], ['/admin/payments/payment-001/verify', 'POST'],
      ['/admin/documents/document-001/approve', 'POST'], ['/admin/certificates', 'POST'],
      ['/admin/service-requests/service-request-001/progress', 'POST'], ['/admin/roles', 'POST'],
      ['/admin/reservations/reservation-001/cancel', 'POST'], ['/admin/companies/company-amica-condo', 'DELETE'],
    ]) await rejectsCode(call(route, 'auditor', method), 'READ_ONLY_PERSONA');
    assert.deepEqual(await store.readDemoWorld(), before);
    assert.ok((await call('/admin/audit-logs', 'auditor')).data.length > 0);
  });
});

test('identity audit is RHC scoped; deleted catalog records retain scope and request correlation', async () => {
  await withRouter(async ({ call, store, router, tokens }) => {
    await router.dispatchDemoRequest({ segments: ['me', 'identity-review'], method: 'POST', token: tokens['customer-noah'], url: new URL('http://127.0.0.1:3002/me/identity-review'), body: { idempotency_key: 'audit-identity' }, requestId: 'offline-request-correlation' });
    const identity = (await store.readDemoWorld()).audit_logs[0];
    assert.equal(identity.company_id, 'company-rhc');
    assert.equal(identity.request_id, 'offline-request-correlation');
    assert.equal(identity.correlation_id, identity.request_id);
    assert.equal((await call('/admin/audit-logs', 'operator-amica')).data.some((row) => row.id === identity.id), false);
    assert.equal((await call('/admin/audit-logs', 'compliance-admin')).data.some((row) => row.id === identity.id), true);
    const created = (await call('/admin/integrations', 'operator-amica', 'POST', { company_id: 'company-amica-condo', project_id: 'project-amica-t1', integration_key: 'OFFLINE_ONLY', name: 'Local catalog fixture', status: 'PREPARED' })).data;
    await call(`/admin/integrations/${created.id}`, 'operator-amica', 'DELETE');
    const removed = (await store.readDemoWorld()).audit_logs[0];
    assert.equal(removed.company_id, 'company-amica-condo');
    assert.equal(removed.project_id, 'project-amica-t1');
    assert.ok((await call('/admin/audit-logs', 'operator-amica')).data.some((row) => row.id === removed.id));
  });
});

test('service requests reject disabled services and expired resident links', async () => {
  await withRouter(async ({ call, store }) => {
    await store.mutateDemoWorld((world) => { world.business_services.find((row) => row.id === 'service-water').status = 'DISABLED'; });
    await rejectsCode(call('/me/service-requests', 'customer-maya', 'POST', { service_id: 'service-water', title: 'Offline request' }), 'SERVICE_UNAVAILABLE');
    await store.mutateDemoWorld((world) => {
      world.business_services.find((row) => row.id === 'service-water').status = 'PREPARED';
      world.property_links[0].effective_to = '2020-01-01';
    });
    await rejectsCode(call('/me/service-requests', 'customer-maya', 'POST', { service_id: 'service-water', title: 'Offline request' }), 'SERVICE_ELIGIBILITY_REQUIRED');
  });
});

test('document versions cannot branch from a stale version with a fresh command key', async () => {
  await withRouter(async ({ call }) => {
    const first = (await call('/me/documents', 'customer-maya', 'POST', { title: 'Offline document', content: 'Synthetic v1', idempotency_key: 'version-base' })).data.document;
    await call(`/me/documents/${first.id}/versions`, 'customer-maya', 'POST', { content: 'Synthetic v2', idempotency_key: 'version-two' });
    await rejectsCode(call(`/me/documents/${first.id}/versions`, 'customer-maya', 'POST', { content: 'Conflicting v2', idempotency_key: 'version-fork' }), 'STALE_DOCUMENT_VERSION');
  });
});

test('consent decisions require an explicit boolean', async () => {
  await withRouter(async ({ call, store }) => {
    const before = await store.readDemoWorld();
    await rejectsCode(call('/me/consents', 'customer-maya', 'POST', { consent_type: 'MARKETING', consent_version: 'DEMO-1', granted: 'true' }), 'INVALID_CONSENT_DECISION');
    assert.equal((await store.readDemoWorld()).revision, before.revision);
  });
});

test('a scoped auditor sees only company/project evidence and still cannot mutate it', async () => {
  await withRouter(async ({ call, store }) => {
    const persona = store.personaById('auditor');
    persona.companyIds = ['company-amica-condo'];
    persona.projectIds = ['project-amica-t1'];
    const companies = (await call('/admin/companies', 'auditor')).data;
    assert.deepEqual(companies.map((row) => row.id), ['company-amica-condo']);
    const projects = (await call('/admin/projects', 'auditor')).data;
    assert.deepEqual(projects.map((row) => row.id), ['project-amica-t1']);
    const audit = (await call('/admin/audit-logs', 'auditor')).data;
    assert.ok(audit.every((row) => row.company_id === 'company-amica-condo' && (!row.project_id || row.project_id === 'project-amica-t1')));
    await rejectsCode(call('/admin/rewards-ledger/credit', 'auditor', 'POST', credit('denied')), 'READ_ONLY_PERSONA');
  });
});

test('HTTP route boundary enforces hosts/origins, opaque disabled profiles, headers, and audit correlation offline', async () => {
  await withRouter(async ({ store, router, tokens }) => {
    const route = evaluate('route', { '../../../lib/demo/store': store, '../../../lib/demo/router': router }).exports;
    const { NextRequest } = require('next/server');
    const request = (segments, method = 'GET', headers = {}, body) => {
      const input = new NextRequest(`http://127.0.0.1:3002/api/demo/${segments.join('/')}`, { method,
        headers: { Host: '127.0.0.1:3002', ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
      return route[method](input, { params: Promise.resolve({ segments }) });
    };
    const trusted = { Origin: 'http://127.0.0.1:3002', Authorization: `Demo ${tokens['customer-maya']}` };
    assert.equal((await request(['session'], 'POST', {}, { persona_id: 'customer-maya' })).status, 403);
    assert.equal((await request(['personas'], 'GET', { Host: 'untrusted.example' })).status, 403);
    assert.equal((await request(['personas'], 'GET', { Origin: 'https://untrusted.example' })).status, 403);
    const preflight = await request(['me'], 'OPTIONS', { Origin: trusted.Origin });
    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers.get('access-control-allow-origin'), trusted.Origin);
    const accepted = await request(['me'], 'PATCH', trusted, { mobile_number: '+639170000111' });
    assert.equal(accepted.status, 200);
    assert.equal(accepted.headers.get('cache-control'), 'no-store, private');
    assert.equal(accepted.headers.get('x-content-type-options'), 'nosniff');
    const payload = await accepted.json();
    assert.equal(payload.meta.provenance, 'DEMO');
    assert.equal((await store.readDemoWorld()).audit_logs[0].request_id, payload.meta.request_id);
    assert.equal(accepted.headers.get('x-rhc-demo-revision'), String(payload.meta.revision));
    for (const value of ['1.0', '+1', '1e0', '"1', '"1""']) {
      const invalid = await request(['me'], 'PATCH', { ...trusted, 'If-Match': value }, { mobile_number: '+639170000111' });
      assert.equal(invalid.status, 400, value);
    }
    process.env.RHC_DEMO_MODE = '0';
    const disabled = await request(['personas']);
    assert.equal(disabled.status, 404);
    assert.equal(await disabled.text(), '');
    assert.equal(disabled.headers.has('x-rhc-demo-revision'), false);
    process.env.RHC_DEMO_MODE = '1';
    process.env.RHC_ENVIRONMENT = 'production';
    const forbidden = await request(['personas']);
    assert.equal(forbidden.status, 404);
    assert.equal(await forbidden.text(), '');
  });
});

test('identity issuance is unique and retry-stable after separate review; admin cannot bypass eligibility', async () => {
  await withRouter(async ({ call, store }) => {
    await call('/me/identity-review', 'customer-noah', 'POST', { idempotency_key: 'identity-review' });
    await rejectsCode(call('/admin/certificates', 'compliance-admin', 'POST', { customer_id: 'usr-customer-002', type: 'RHC Customer Verification Certificate', linked_record: 'IDENTITY-REVIEW-DEMO-noah', source_version: 1 }), 'RHC_ID_INELIGIBLE');
    await call('/admin/users/usr-customer-002/verification/approve', 'compliance-admin', 'POST', { expected_status: 'PENDING', review_reference: 'OFFLINE-REVIEW' });
    const first = (await call('/me/rhc-id', 'customer-noah', 'POST')).data;
    const repeated = (await call('/me/rhc-id', 'customer-noah', 'POST')).data;
    assert.deepEqual(repeated, first);
    assert.ok(first.public_reference);
    const ids = (await store.readDemoWorld()).users.map((user) => user.profile.rhc_id).filter(Boolean);
    assert.equal(new Set(ids).size, ids.length);
    const verified = (await call(`/verify/rhc-id/${first.public_reference}`, null)).data;
    assert.equal(verified.valid, true);
    assert.equal(verified.rhc_id, first.rhc_id);
  });
});

test('profile changes validate types and persist only redacted audit values', async () => {
  await withRouter(async ({ call, store }) => {
    await rejectsCode(call('/me', 'customer-noah', 'PATCH', { first_name: { nested: 'wrong' } }), 'INVALID_PROFILE_FIELD');
    await call('/me', 'customer-noah', 'PATCH', { address_line: 'Synthetic private address sentinel' });
    const world = await store.readDemoWorld();
    assert.equal(JSON.stringify(world.audit_logs).includes('Synthetic private address sentinel'), false);
  });
});
