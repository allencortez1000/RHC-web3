import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(join(root, path), 'utf8');
const parse = (path) => ts.createSourceFile(path, read(path), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function walk(path) {
  return readdirSync(join(root, path), { withFileTypes: true }).flatMap((entry) => {
    const child = `${path}/${entry.name}`;
    return entry.isDirectory() ? walk(child) : [child];
  });
}
function visit(node, callback) {
  callback(node);
  ts.forEachChild(node, (child) => visit(child, callback));
}
// Evaluate selected declarations only, never page imports, providers, environment files or servers.
// Production functions are tested without exporting unsupported symbols from Next page modules.
function declarations(path, names, bindings = {}) {
  const source = parse(path);
  const selected = source.statements.filter((node) =>
    (node.name && names.includes(node.name.text)) ||
    (ts.isVariableStatement(node) && node.declarationList.declarations.some((item) => names.includes(item.name.getText(source)))),
  );
  assert.equal(selected.length, names.length, `Missing audit declaration in ${path}`);
  const code = selected.map((node) => node.getText(source).replace(/^export\s+(?:default\s+)?/, '')).join('\n');
  const compiled = ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, jsxFactory: 'h', jsxFragmentFactory: 'Fragment' } }).outputText;
  return vm.runInNewContext(`${compiled}\n({${names.join(',')}})`, { ...bindings }, { timeout: 2000 });
}
const appRoot = (app) => `apps/${app}-web/app`;
function routes(app) {
  return walk(appRoot(app)).filter((path) => path.endsWith('/page.tsx')).map((file) => ({ file, route: file.slice(appRoot(app).length, -'/page.tsx'.length) || '/' }));
}
function resolves(app, href) {
  const pathname = href.split(/[?#]/, 1)[0];
  return routes(app).some(({ route }) => {
    const pattern = route.split('/').map((part) => part.startsWith('[') ? '[^/]+' : part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('/');
    return new RegExp(`^${pattern}/?$`).test(pathname);
  }) || existsSync(join(root, `apps/${app}-web/public`, pathname));
}
const navPath = 'apps/customer-web/app/web3-nav.ts';
const adminPath = 'apps/admin-web/app/admin-data.tsx';
const reportPath = 'apps/admin-web/app/reports/page.tsx';
const nav = declarations(navPath, ['customerNavItems', 'activeAliases', 'navFor']);
const scopeHelpers = declarations('apps/admin-web/app/capability-scopes.ts', ['globalTarget', 'scopeValue', 'asScope', 'globalScope', 'grantCoversTarget', 'hasEffectiveGrant']);
const admin = declarations(adminPath, ['adminNavGroups', 'adminNavItems', 'routePermissions', 'moduleDefinitions', 'visibleModules', 'canAccessAdminRoute'], scopeHelpers);
const capabilityPath = 'apps/api/src/modules/admin/capabilities.controller.ts';
const backendCapabilities = declarations(capabilityPath, ['ADMIN_CAPABILITY_PERMISSIONS', 'ADMIN_MUTATION_PERMISSIONS', 'ADMIN_CAPABILITY_MODULES', 'listGrantIsUsable']);
const demoModules = declarations('apps/customer-web/app/lib/demo/router.ts', ['adminReadPermissions']);

function capabilityFixture(permissions, mode = 'api', scope = { company_id: null, project_id: null }) {
  const grants = Object.fromEntries(permissions.map((permission) => [permission, [{ ...scope }]]));
  const modules = Array.from(backendCapabilities.ADMIN_CAPABILITY_MODULES, (module) => ({
    path: module.path, permission: module.permission,
    usable: (grants[module.permission] || []).some((grant) => backendCapabilities.listGrantIsUsable(grant, module.list, module.globalOnly)),
  }));
  if (mode === 'demo') {
    // Synthetic-only destinations require explicit server advertisement, not just a flattened permission.
    for (const [resource, permission] of Object.entries(demoModules.adminReadPermissions)) {
      if (!modules.some((module) => module.path === '/' + resource)) modules.push({
        path: '/' + resource, permission, usable: Boolean(grants[permission]?.length),
      });
    }
  }
  return { permissions: [...permissions], grants, mutation_permissions: [], mutation_grants: {}, modules };
}
const capabilities = declarations('packages/ui/src/api-capabilities.ts', ['demoCapabilities', 'unavailableRoutes', 'getCapabilityAvailability', 'getRequestAvailability']);
const reportNames = ['manilaDateTime', 'valueAt', 'text', 'dateValue', 'pointsValue', 'phpMinorValue', 'reports', 'availableReports', 'displayValue', 'csvCell'];
const report = declarations(reportPath, reportNames, { ...capabilities, canAccessAdminRoute: admin.canAccessAdminRoute });

test('route document exactly inventories actual customer and admin page files', (t) => {
  const doc = read('docs/route-coverage.md');
  for (const [app, label, count] of [['customer', 'Customer', 40], ['admin', 'Admin', 31]]) {
    const section = doc.split(`## ${label} routes`)[1].split('\n## ')[0];
    const documented = [...section.matchAll(/^\|\s*\d+\s*\|\s*`([^`]+)`/gm)].map((match) => match[1]).sort();
    const actual = routes(app).map(({ route }) => route).sort();
    assert.equal(actual.length, count);
    assert.deepEqual(documented, actual);
    t.diagnostic(`${label}: ${actual.length} actual page files, each documented once`);
  }
});

test('all primary navigation destinations exist and all admin workspaces are discoverable', (t) => {
  for (const item of nav.customerNavItems) assert.ok(resolves('customer', item.href), `Customer destination ${item.href}`);
  for (const [, href] of admin.adminNavItems) assert.ok(resolves('admin', href), `Admin destination ${href}`);
  assert.equal(new Set(nav.customerNavItems.map((item) => item.href)).size, nav.customerNavItems.length);
  assert.equal(new Set(admin.adminNavItems.map((item) => item[1])).size, admin.adminNavItems.length);
  const supporting = ['/dashboard', '/login', '/forgot-password', '/reset-password', '/verify-email', '/auth/confirm'];
  assert.deepEqual(routes('admin').map(({ route }) => route).filter((route) => !supporting.includes(route)).sort(), Array.from(admin.adminNavItems, ([, href]) => href).sort());
  t.diagnostic(`${nav.customerNavItems.length} customer and ${admin.adminNavItems.length} admin primary destinations resolve`);
});

test('literal local hrefs and redirects in app source resolve to a page or public asset', (t) => {
  let checked = 0;
  const failures = [];
  for (const app of ['customer', 'admin']) {
    for (const path of walk(appRoot(app)).filter((file) => /\.tsx?$/.test(file) && !file.includes('/lib/demo/') && !file.includes('/api/'))) {
      const source = parse(path);
      visit(source, (node) => {
        let value;
        if (ts.isJsxAttribute(node) && node.name.getText(source) === 'href') {
          const initializer = node.initializer;
          if (initializer && ts.isStringLiteral(initializer)) value = initializer.text;
          if (initializer && ts.isJsxExpression(initializer) && initializer.expression && ts.isStringLiteral(initializer.expression)) value = initializer.expression.text;
        }
        if (ts.isPropertyAssignment(node) && node.name.getText(source) === 'href' && ts.isStringLiteral(node.initializer)) value = node.initializer.text;
        if (ts.isCallExpression(node) && node.expression.getText(source) === 'redirect' && node.arguments[0] && ts.isStringLiteral(node.arguments[0])) value = node.arguments[0].text;
        if (!value?.startsWith('/') || value.startsWith('//')) return;
        checked++;
        if (!resolves(app, value)) failures.push(`${path}:${source.getLineAndCharacterOfPosition(node.pos).line + 1} -> ${value}`);
      });
    }
  }
  assert.deepEqual(failures, []);
  t.diagnostic(`${checked} literal local links/redirects checked; dynamic URLs and fragment existence require separate review`);
});

test('each canonical customer navigation label activates only its own destination', () => {
  for (const item of nav.customerNavItems) {
    assert.deepEqual(Array.from(nav.navFor(item.label).filter((candidate) => candidate.active), (candidate) => candidate.href), [item.href]);
  }
  for (const [label, aliases] of Object.entries(nav.activeAliases)) {
    for (const alias of aliases) assert.equal(nav.navFor(alias).filter((item) => item.active).length, 1, `${label}: ${alias}`);
  }
});

test('reports navigation accepts every usable report read capability, but no unrelated capability', () => {
  for (const permission of new Set(report.reports.map((item) => item.permission))) assert.equal(admin.canAccessAdminRoute(capabilityFixture([permission]), '/reports'), true);
  for (const fixture of [undefined, capabilityFixture([]), capabilityFixture(['property.view'])]) assert.equal(admin.canAccessAdminRoute(fixture, '/reports'), false);
  const unusable = capabilityFixture(['reservation.view']);
  unusable.modules.forEach((module) => { module.usable = false; });
  assert.equal(admin.canAccessAdminRoute(unusable, '/reports'), false, 'Permissions alone cannot override unusable server modules');
  assert.equal(admin.canAccessAdminRoute(capabilityFixture(['integration.view'], 'api', { company_id: 'company-test', project_id: 'project-test' }), '/reports'), false, 'A project-scoped integration grant is not list access');
});

test('report families are both capability-filtered and transport-supported', () => {
  const permissions = ['reservation.view', 'customer.view', 'integration.view', 'audit.view'];
  assert.deepEqual(Array.from(report.availableReports(capabilityFixture(permissions), 'api'), (item) => item.key), ['reservations', 'audit']);
  assert.equal(report.availableReports(capabilityFixture(permissions, 'demo'), 'demo').length, 6);
  assert.equal(report.availableReports(capabilityFixture(['customer.view']), 'api').length, 0);
  assert.deepEqual(Array.from(report.availableReports(capabilityFixture(['audit.view'], 'demo'), 'demo'), (item) => item.key), ['audit']);
  assert.equal(report.availableReports(undefined, 'demo').length, 0);
  assert.equal(report.availableReports(capabilityFixture([]), 'api').length, 0);
  assert.equal(report.availableReports(capabilityFixture([]), 'demo').length, 0);
  assert.equal(report.availableReports(capabilityFixture(['customer.view']), 'demo').length, 0, 'Demo-only modules must be explicitly advertised');
  assert.deepEqual(Array.from(report.availableReports(capabilityFixture(permissions, 'demo'), 'api'), (item) => item.key), ['reservations', 'audit'], 'Demo advertisement cannot enable unsupported API transports');
});

test('CSV cells neutralize formulas, quote delimiters and retain multiline data', () => {
  for (const value of ['=1+1', '+SUM(A1)', '-1+2', '@SUM(A1)', ' \t=1+1', '\r\n@SUM(A1)']) assert.ok(report.csvCell(value).startsWith('"\''));
  assert.equal(report.csvCell('a,"b"\nc'), '"a,""b""\nc"');
  assert.equal(report.csvCell('ordinary'), '"ordinary"');
});

test('report numeric formatters distinguish absent evidence from genuine zero', () => {
  for (const format of [report.pointsValue, report.phpMinorValue]) {
    for (const value of [null, undefined, '']) assert.equal(format(value), 'Not provided');
    assert.notEqual(format(0), 'Not provided');
  }
  assert.match(report.phpMinorValue(12345), /123\.45/);
  assert.equal(report.pointsValue(125), '125 points');
});

const h = (type, props, ...children) => ({ type, props: props || {}, children: children.flat(Infinity) });
function nodes(tree) {
  if (!tree || typeof tree !== 'object') return [];
  return [tree, ...(tree.children || []).flatMap(nodes)];
}
test('certificate success survives React clearing currentTarget after the first await', async () => {
  const changes = [];
  let resolveRequest;
  const form = { resetCount: 0, reset() { this.resetCount++; } };
  const pending = new Promise((done) => { resolveRequest = done; });
  let slot = 0;
  const page = declarations('apps/admin-web/app/certificates/page.tsx', ['Page'], {
    h, AdminShell: 'shell', AdminTable: 'table', Card: 'card', ResourceStatus: 'status', Web3Button: 'button',
    useState: (initial) => { const key = slot++; return [initial, (value) => changes.push([key, typeof value === 'function' ? value(initial) : value])]; },
    usePagedResource: () => ({ data: [{ id: 'synthetic-customer', email: 'customer@example.test' }] }),
    useRuntime: () => ({ request: () => pending }),
    FormData: class { constructor(element) { assert.equal(element, form); } get() { return 'synthetic'; } },
    errorMessage: () => 'Submission failed',
  });
  const submit = nodes(page.Page()).find((node) => node.type === 'form').props.onSubmit;
  const event = { currentTarget: form, preventDefault() {} };
  const result = submit(event);
  event.currentTarget = null;
  resolveRequest({ reference: 'DEMO-CERT-TEST' });
  await result;
  assert.equal(form.resetCount, 1);
  assert.ok(changes.some(([key, value]) => key === 3 && value === 1), 'Refresh the certificate table after success');
  assert.ok(!changes.some(([key, value]) => key === 2 && value), 'Do not show a false failure after issuance');
});

test('report filters, CSV and print use only the loaded matching rows with provenance', async () => {
  let blob;
  let printed = false;
  const anchor = { click() {}, remove() {} };
  const data = [
    { id: 'start', reservation_number: '=DEMO-START', status: 'PENDING', created_at: '2026-09-20T16:00:00Z', confidential: 'OMIT-PRIVATE-FIELD' },
    { id: 'end', reservation_number: 'DEMO-END', status: 'PENDING', created_at: '2026-09-21T15:59:59.999Z' },
    { id: 'before', reservation_number: 'OMIT-BEFORE', status: 'PENDING', created_at: '2026-09-20T15:59:59.999Z' },
    { id: 'after', reservation_number: 'OMIT-AFTER', status: 'PENDING', created_at: '2026-09-21T16:00:00Z' },
    { id: 'other', reservation_number: 'OMIT-STATUS', status: 'CANCELLED', created_at: '2026-09-21T00:00:00Z' },
    { id: 'invalid', reservation_number: 'OMIT-INVALID', status: 'PENDING', created_at: 'invalid' },
  ];
  const state = ['demo', 'PENDING', '2026-09-21', '2026-09-21', ''];
  const dataset = declarations(reportPath, ['ReportDataset'], {
    ...report, h, Badge: 'badge', Card: 'card', EmptyState: 'empty', MetricCard: 'metric', ResourceStatus: 'status', Web3Button: 'button',
    useState: () => [state.shift(), () => {}], useMemo: (work) => work(),
    useRuntime: () => ({ dataMode: 'demo' }),
    usePagedResource: () => ({ data, hasMore: true, loading: false, loadMore() {} }),
    Blob, URL: { createObjectURL(value) { blob = value; return 'blob:offline'; }, revokeObjectURL() {} },
    document: { createElement: () => anchor, body: { appendChild() {} } },
    window: { print() { printed = true; } },
  });
  const tree = nodes(dataset.ReportDataset({ definition: report.reports[0] }));
  assert.equal(tree.find((node) => node.type === 'metric' && node.props.label === 'Filtered records').props.value, '2');
  assert.equal(tree.filter((node) => node.type === 'tr').length, 3, 'Only a header and the two matching rows reach print markup');
  tree.find((node) => node.type === 'button' && node.children.includes('Export filtered CSV')).props.onClick();
  const csv = await blob.text();
  assert.match(csv, /DEMO — SYNTHETIC DATA/);
  assert.match(csv, /2 filtered records from 6 loaded records/);
  assert.ok(csv.includes('"\'=DEMO-START"'));
  assert.match(csv, /DEMO-END/);
  assert.ok(!csv.includes('OMIT-'), 'No filtered-out rows or unselected fields may be exported');
  assert.equal(anchor.download, 'rhc-demo-reservations-report.csv');
  tree.find((node) => node.type === 'button' && node.children.includes('Print report')).props.onClick();
  assert.equal(printed, true);
});

function decorators(node) {
  return (ts.getDecorators(node) || []).map((item) => item.expression).filter(ts.isCallExpression);
}
function decorator(node, name) { return decorators(node).find((item) => item.expression.getText() === name); }
function controllerInventory() {
  const endpoints = [];
  for (const file of walk('apps/api/src').filter((path) => path.endsWith('.controller.ts'))) {
    const source = parse(file);
    for (const controller of source.statements.filter(ts.isClassDeclaration)) {
      const base = decorator(controller, 'Controller');
      if (!base) continue;
      for (const member of controller.members) {
        const method = decorators(member).find((item) => ['Get', 'Post', 'Patch', 'Put', 'Delete'].includes(item.expression.getText()));
        if (!method) continue;
        const path = [base.arguments[0]?.text, method.arguments[0]?.text].filter(Boolean).join('/');
        const guards = [decorator(controller, 'UseGuards'), decorator(member, 'UseGuards')].filter(Boolean).flatMap((item) => item.arguments.map((arg) => arg.getText()));
        endpoints.push({ file, method: method.expression.getText().toUpperCase(), path: `/api/v1/${path}`, guards, policy: decorator(member, 'RequirePermission') || decorator(controller, 'RequirePermission'), scope: decorator(member, 'RequireApiScope') || decorator(member, 'SetMetadata') });
      }
    }
  }
  return endpoints;
}

test('every Nest endpoint is explicitly public, JWT-owned, permission-guarded, or machine-scoped', (t) => {
  const publicEndpoints = ['auth/config', 'health', 'health/ready', 'companies', 'business-services', 'projects', 'properties', 'properties/:id', 'verify/rhc-id/:token'].map((path) => `GET /api/v1/${path}`).sort();
  const inventory = controllerInventory();
  const actualPublic = [];
  const selfInspection = [];
  for (const endpoint of inventory) {
    const label = `${endpoint.method} ${endpoint.path}`;
    if (label === 'GET /api/v1/admin/capabilities') {
      assert.equal(endpoint.file, capabilityPath);
      assert.ok(endpoint.guards.includes('AuthGuard'), 'Self-capabilities must require a verified JWT');
      selfInspection.push(label);
    } else if (endpoint.path.startsWith('/api/v1/admin/')) {
      assert.ok(endpoint.guards.includes('AuthGuard') && endpoint.guards.includes('PermissionGuard') && endpoint.policy, `Missing admin policy: ${label}`);
    } else if (endpoint.guards.includes('CompanyApiGuard')) {
      assert.ok(endpoint.scope, `Missing machine scope: ${label}`);
    } else if (!endpoint.guards.includes('AuthGuard')) actualPublic.push(label);
  }
  assert.deepEqual(selfInspection, ['GET /api/v1/admin/capabilities'], 'Only the exact GET self-inspection route has this exception');
  assert.deepEqual(actualPublic.sort(), publicEndpoints);
  const counts = { public: actualPublic.length, admin: inventory.filter((endpoint) => endpoint.path.startsWith('/api/v1/admin/')).length, machine: inventory.filter((endpoint) => endpoint.guards.includes('CompanyApiGuard')).length };
  t.diagnostic(`${inventory.length} Nest method/path pairs: ${counts.public} public, ${counts.admin} admin, ${counts.machine} machine, ${inventory.length - counts.public - counts.admin - counts.machine} JWT self-service/session`);
  assert.equal(new Set(inventory.map((endpoint) => `${endpoint.method} ${endpoint.path}`)).size, inventory.length);
});


test('admin capabilities inspects only the JWT principal and grants no access to an empty actor', async () => {
  const source = parse(capabilityPath);
  const controller = source.statements.find((node) => ts.isClassDeclaration(node) && node.name?.text === 'CapabilitiesController');
  assert.ok(controller);
  assert.ok(decorator(controller, 'UseGuards')?.arguments.some((arg) => arg.getText(source) === 'AuthGuard'));
  const method = controller.members.find((node) => ts.isMethodDeclaration(node) && node.name.getText(source) === 'capabilities');
  assert.ok(method);
  assert.equal(decorator(method, 'Get')?.arguments[0]?.text, 'capabilities');
  assert.equal(method.parameters.length, 1, 'No query/body/route parameter can select another account');
  assert.ok(decorator(method.parameters[0], 'CurrentUser'), 'Actor is injected from JWT authentication');
  assert.deepEqual(Array.from(decorator(method, 'Header')?.arguments || [], (arg) => arg.text), ['Cache-Control', 'no-store']);
  // Evaluate the real method only, without Nest imports, server construction or database access.
  const text = method.getText(source).replace('async capabilities(', 'async function capabilities(').replace('@CurrentUser() ', '');
  const compiled = ts.transpileModule(text, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  const inspect = vm.runInNewContext(compiled + String.fromCharCode(10) + 'capabilities', backendCapabilities, { timeout: 2000 });
  for (const actor of [
    { id: 'jwt-customer', grants: {} },
    { id: 'jwt-scoped', grants: { 'company.view': [{ company_id: 'company-test', project_id: 'project-test' }], 'reservation.view': [{ company_id: 'company-test', project_id: 'project-test' }] } },
  ]) {
    const calls = [];
    const result = await inspect.call({ rbac: { grants: async (userId, permission) => {
      calls.push([userId, permission]);
      assert.equal(userId, actor.id, 'Every grant lookup must use this JWT principal');
      return actor.grants[permission] || [];
    } } }, { id: actor.id, email: 'private-sentinel@example.test' });
    assert.deepEqual(calls.map(([, permission]) => permission), [...backendCapabilities.ADMIN_CAPABILITY_PERMISSIONS, ...backendCapabilities.ADMIN_MUTATION_PERMISSIONS]);
    assert.deepEqual(Array.from(result.permissions), Object.keys(actor.grants));
    assert.deepEqual(Array.from(result.mutation_permissions), []);
    assert.equal(JSON.stringify(result).includes('private-sentinel'), false);
    if (actor.id === 'jwt-customer') {
      assert.equal(Object.keys(result.grants).length, 0);
      assert.equal(Object.keys(result.mutation_grants).length, 0);
      assert.ok(result.modules.every((module) => !module.usable));
    } else {
      assert.equal(result.modules.find((module) => module.path === '/').usable, false, 'Project-only company grant is not dashboard access');
      assert.equal(result.modules.find((module) => module.path === '/reservations').usable, true);
      assert.equal(result.grants['reservation.view'][0].project_id, 'project-test', 'Scoped grants are not promoted to global');
    }
  }
});
