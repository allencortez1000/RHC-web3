'use strict';
const fs = require('node:fs');
const path = require('node:path');
const b = require('./boundary.cjs');
const { makeDelay } = require('./real-response-delay.cjs');
const { chromium, expect: baseExpect } = require('@playwright/test');
const expect = baseExpect.configure({ timeout: 12000 });
const customer = 'http://127.0.0.1:3002';
const admin = 'http://127.0.0.1:3003';
const out = process.env.DEMO_OUTPUT;
const matrix = JSON.parse(fs.readFileSync(path.join(__dirname, 'expected-outcomes.json'), 'utf8'));
const { selection, includes } = require('./selection.cjs');
const plan = selection(process.env.DEMO_SELECTION || 'full', matrix);
const report = { started: new Date().toISOString(), status: 'NOT RUN', selection: plan, setup: [], cells: matrix.cells, supplemental: [], mutations: [], errors: [], expectedFailures: [], blocked: [], screenshots: [] };
for (const cell of report.cells) if (!includes(plan, cell)) cell.reason = 'Excluded by explicit targeted continuation selection';
const redact = value => String(value).replace(/rhc_demo_[a-f0-9]{32}/g, '[demo-session-redacted]').replace(/Bearer\s+\S+/gi, 'Bearer [redacted]');
let browser, active = 'setup', mode = null, halted = false;
const contexts = [];
const injections = [];
const expectedDenied = new Set();
const realDelays = [];
function armDelay(a, paths, name, token) {
  const gate = makeDelay({ page: a.page, paths, token, name, log,
    onError: error => { report.errors.push({ cell: active, message: redact(error.stack) }); },
  });
  realDelays.push(gate);
  return gate;
}
const safeValue = (_key, value) => typeof value === 'string' ? redact(value) : value;
function persist() { fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(report, safeValue, 2) + '\n'); }
function log(kind, value) { fs.appendFileSync(path.join(out, 'browser-events.jsonl'), JSON.stringify({ at: new Date().toISOString(), cell: active, kind, ...value }, safeValue) + '\n'); }
function urlLabel(raw) { try { const u = new URL(raw); return u.origin + u.pathname; } catch { return '[invalid-url]'; } }
function observe(page, actor) {
  page.on('console', m => {
    const item = { actor, cell: active, type: m.type(), text: redact(m.text()), location: urlLabel(m.location().url) };
    log('console', item);
    const expected = (mode && b.fixturePaths.has(new URL(m.location().url || customer).pathname)) ||
      [...expectedDenied].some(key => key.startsWith(item.location + ':'));
    if (m.type() === 'error' && !expected) report.errors.push(item);
  });
  page.on('pageerror', error => { const item = { actor, cell: active, message: redact(error.stack) }; report.errors.push(item); log('pageerror', item); });
  page.on('requestfailed', req => {
    const item = { actor, path: urlLabel(req.url()), error: req.failure()?.errorText };
    const expected = b.fixturePaths.has(new URL(req.url()).pathname) && mode === 'connectionfailed';
    log(expected ? 'expected-requestfailure' : 'requestfailure', item);
    if (!expected && !/ERR_ABORTED/.test(item.error || '')) report.errors.push({ cell: active, ...item });
  });
  page.on('response', res => {
    if (res.status() < 400) return;
    const label = urlLabel(res.url());
    const expected = (b.fixturePaths.has(new URL(res.url()).pathname) && mode !== null && res.status() === 503) || expectedDenied.has(label + ':' + res.status());
    const item = { actor, cell: active, path: label, status: res.status() };
    log(expected ? 'expected-http' : 'unexpected-http', item);
    (expected ? report.expectedFailures : report.errors).push(item);
  });
  page.on('download', download => { void download.cancel(); log('download-blocked', { actor }); report.errors.push({ cell: active, message: 'Unexpected download blocked' }); });
}
async function actor(name) {
  const context = await browser.newContext({ serviceWorkers: 'block', acceptDownloads: false, reducedMotion: 'reduce', viewport: { width: 1440, height: 900 } });
  context.setDefaultTimeout(15000);
  context.setDefaultNavigationTimeout(45000);
  contexts.push(context);
  if (typeof context.routeWebSocket !== 'function') throw Error('BLOCKED: installed Playwright lacks exact WebSocket routing');
  await context.routeWebSocket('**/*', socket => {
    if (!b.allowedWebSocket(socket.url())) {
      report.blocked.push({ cell: active, kind: 'websocket', path: urlLabel(socket.url()) });
      socket.close({ code: 1008, reason: 'Exact owned HMR endpoints only' }); return;
    }
    try { b.assertOwned(new URL(socket.url()).port); socket.connectToServer(); }
    catch (error) { report.errors.push({ cell: active, message: redact(error.message) }); socket.close({ code: 1008, reason: 'Ownership unavailable' }); }
  });
  await context.route('**/*', async route => {
    const req = route.request();
    const u = new URL(req.url());
    if (!b.allowedRequest(req.url(), req.method())) {
      const item = { cell: active, kind: 'request', path: urlLabel(req.url()), method: req.method() };
      report.blocked.push(item); log('boundary-block', item); await route.abort('blockedbyclient'); return;
    }
    try { b.assertOwned(u.port); }
    catch (error) { report.errors.push({ cell: active, message: redact(error.message) }); await route.abort('blockedbyclient'); return; }
    for (const gate of realDelays) {
      if (gate.matches(req)) { await gate.handle(route); return; }
    }
    if (mode && req.method() === 'GET' && b.fixturePaths.has(u.pathname)) {
      const injection = { cell: active, actor: name, mode, path: u.pathname };
      injections.push(injection); log('injection', injection);
      if (mode === 'connectionfailed') { await route.abort('connectionfailed'); return; }
      if (mode === 'delayed503') await new Promise(resolve => setTimeout(resolve, 2500));
      await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ success: false, error: { code: 'SYNTHETIC_WEB3_UNAVAILABLE', message: 'Synthetic Web3-only failure; core demo records are unaffected.' } }) });
      return;
    }
    log('request', { actor: name, method: req.method(), path: urlLabel(req.url()) });
    await route.continue();
  });
  context.on('page', page => observe(page, name));
  return { name, context, page: await context.newPage(), token: null };
}
async function visit(a, route, heading, origin = customer) {
  b.assertOwned(new URL(origin).port);
  const response = await a.page.goto(origin + route, { waitUntil: 'domcontentloaded', timeout: 45000 });
  if (response && response.status() >= 400) throw Error('Navigation failed: ' + route + ' ' + response.status());
  if (heading) await expect(a.page.getByRole('heading', { name: heading, exact: typeof heading === 'string' })).toBeVisible();
}
async function login(a, persona, target = customer) {
  await visit(a, '/login', 'Choose your workspace');
  await selectPersona(a, persona, target);
}
async function selectPersona(a, persona, target = customer) {
  const enter = a.page.getByRole('button', { name: 'Enter selected workspace', exact: true });
  await expect(enter).toHaveAttribute('data-demo-ready', 'true');
  await a.page.locator(`input[name="demo_persona"][value="${persona}"]`).check();
  const response = a.page.waitForResponse(r => r.url() === customer + '/api/demo/session' && r.request().method() === 'POST');
  await enter.click();
  expect((await response).status()).toBe(200);
  await a.page.waitForURL(u => u.origin === target && u.pathname === (target === admin ? '/' : '/dashboard'));
  await expect(a.page.getByRole('heading', { name: target === admin ? 'Command Center' : 'My RHC Dashboard', exact: true })).toBeVisible();
  // Admin selection intentionally performs window.location.assign. Its response
  // body may be evicted by Chromium before the click promise resolves. Read the
  // actual cookie written by the supported adapter, never invent a session.
  const cookieName = target === admin ? 'rhc_admin_demo_session' : 'rhc_customer_demo_session';
  const cookie = (await a.context.cookies(target)).find(item => item.name === cookieName);
  expect(cookie, 'Supported login must persist its application session').toBeTruthy();
  const session = JSON.parse(decodeURIComponent(cookie.value));
  expect(session.access_token).toMatch(/^rhc_demo_[a-f0-9]{32}$/);
  expect(session.user.id).toBe({ 'customer-maya': 'usr-customer-001', 'customer-noah': 'usr-customer-002', 'system-admin': 'usr-staff-system' }[persona]);
  a.token = session.access_token;
}
async function api(a, endpoint, method = 'GET', body, deniedStatus) {
  const url = customer + '/api/demo' + endpoint;
  if (!b.allowedRequest(url, method)) throw Error('Forbidden helper request');
  if (deniedStatus) expectedDenied.add(urlLabel(url) + ':' + deniedStatus);
  const result = await a.page.evaluate(async ({ url, method, body, token }) => {
    const res = await fetch(url, { method, headers: { 'content-type': 'application/json', authorization: 'Bearer ' + token }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    return { status: res.status, json: await res.json() };
  }, { url, method, body, token: a.token });
  expect(result.status).toBe(deniedStatus || 200);
  if (deniedStatus) {
    log('genuine-denial', { actor: a.name, endpoint, status: result.status, code: result.json.error?.code });
    expectedDenied.delete(urlLabel(url) + ':' + deniedStatus);
  }
  return result.json.data;
}
async function shot(a, suffix) {
  const file = active.replace(/[^a-z0-9-]/gi, '-') + '-' + suffix + '.png';
  await a.page.screenshot({ path: path.join(out, file), fullPage: true, animations: 'disabled', timeout: 10000 });
  report.screenshots.push(file);
  const snapshot = await a.page.locator('body').ariaSnapshot({ timeout: 5000 });
  fs.writeFileSync(path.join(out, file.replace(/\.png$/, '.aria.txt')), redact(snapshot));
}
async function outage(a, staff = false) {
  const probe = { ...a, page: await a.context.newPage() };
  const start = injections.length;
  try {
    await visit(probe, staff ? '/integrations' : '/future-technology', null, staff ? admin : customer);
    await expect.poll(() => injections.slice(start).some(i => i.actor === a.name)).toBe(true);
    if (mode === 'delayed503') await expect(probe.page.getByRole('status').filter({ hasText: 'Loading records' }).first()).toBeVisible();
    await expect(probe.page.getByRole('alert').filter({ hasNotText: '__next' }).first()).toBeVisible();
    await expect(probe.page.getByRole('region', { name: 'Read-only Web3 result' })).toHaveCount(0);
    await shot(probe, a.name + '-web3-' + mode);
  } finally { await probe.page.close(); }
}
function metric(page, label) { return page.locator('.rhc-card').filter({ has: page.locator('.rhc-metric-label').filter({ hasText: new RegExp('^' + label + '$') }) }).locator('.rhc-value'); }
async function J1({ maya, noah }) {
  await visit(maya, '/profile', 'User Profile');
  await expect(maya.page.getByRole('heading', { name: 'Maya Santos', exact: true })).toBeVisible();
  const phone = '+639170408005';
  await maya.page.getByLabel('Mobile number', { exact: true }).fill(phone);
  await maya.page.getByRole('button', { name: 'Save profile', exact: true }).click();
  await expect(maya.page.getByRole('status').filter({ hasText: 'Profile saved.' })).toBeVisible();
  await maya.page.reload({ waitUntil: 'domcontentloaded' });
  await expect(maya.page.getByLabel('Mobile number', { exact: true })).toHaveValue(phone);
  await api(maya, '/me', 'PATCH', { first_name: 'Forbidden Synthetic Rename' }, 400);
  await visit(noah, '/profile', 'User Profile');
  await expect(noah.page.getByRole('heading', { name: 'Noah Reyes', exact: true })).toBeVisible();
  await expect(noah.page.locator('main')).not.toContainText('maya.santos@example.test');
  report.mutations.push({ cell: active, type: 'profile mobile', actor: 'customer-maya' });
  await shot(maya, 'profile-reloaded');
}
async function J2({ maya, noah, staff }) {
  await visit(maya, '/reservations', 'Reservations');
  const select = maya.page.locator('label').filter({ hasText: 'Available property' }).getByRole('combobox');
  await expect(select).toBeVisible();
  await expect(select).toHaveAccessibleName(/Available property/);
  await select.selectOption({ index: 1 });
  const response = maya.page.waitForResponse(r => r.url() === customer + '/api/demo/me/reservations' && r.request().method() === 'POST');
  await maya.page.getByRole('button', { name: 'Create reservation', exact: true }).click();
  const created = (await (await response).json()).data;
  expect(created.reservation_number).toMatch(/^DEMO-RES-/);
  report.mutations.push({ cell: active, type: 'reservation create', reference: created.reservation_number });
  await expect(maya.page.getByRole('status').filter({ hasText: 'Reservation request created.' })).toBeVisible();
  await visit(staff, '/reservations', 'Reservations', admin);
  await staff.page.getByLabel('Search records', { exact: true }).fill(created.reservation_number);
  await expect(staff.page.getByRole('row').filter({ hasText: created.reservation_number })).toContainText('PENDING');
  await api(noah, '/me/reservations/' + encodeURIComponent(created.id) + '/cancel', 'POST', {}, 404);
  const card = maya.page.locator('div.rounded-xl').filter({ has: maya.page.getByText(created.reservation_number, { exact: true }) }).filter({ has: maya.page.getByRole('button', { name: 'Cancel reservation', exact: true }) });
  maya.page.once('dialog', dialog => dialog.accept());
  await card.getByRole('button', { name: 'Cancel reservation', exact: true }).click();
  await expect(maya.page.getByRole('status').filter({ hasText: 'was cancelled' })).toBeVisible();
  await maya.page.reload({ waitUntil: 'domcontentloaded' });
  const rows = await api(maya, '/me/reservations');
  expect(rows.find(r => r.id === created.id).status).toBe('CANCELLED');
  report.mutations.push({ cell: active, type: 'reservation cancel', reference: created.reservation_number });
  await visit(maya, '/properties', 'Explore Properties');
  await maya.page.getByRole('textbox', { name: 'Search property inventory' }).fill('synthetic-no-match-040805');
  await expect(metric(maya.page, 'Matching records')).toHaveText('0');
  await expect(metric(maya.page, 'Available units')).toHaveText('0');
  await shot(maya, 'genuine-filtered-zero');
}
async function J3({ maya, noah, staff }) {
  const title = 'Synthetic owned demo ' + mode;
  await visit(maya, '/documents', 'Documents');
  await maya.page.getByLabel('Document title', { exact: true }).fill(title);
  await maya.page.getByLabel('Synthetic text file', { exact: true }).setInputFiles({ name: 'synthetic-owned-evidence.txt', mimeType: 'text/plain', buffer: Buffer.from('Synthetic bounded exercise only. No personal information or live provider.') });
  await maya.page.getByRole('button', { name: 'Submit for review', exact: true }).click();
  await expect(maya.page.locator('article').filter({ hasText: title }).first()).toBeVisible();
  report.mutations.push({ cell: active, type: 'document submit', title });
  const search = maya.page.getByRole('textbox', { name: /Search title, category, property, or status/i });
  await search.fill('synthetic-no-match-040805');
  await expect(maya.page.getByRole('heading', { name: 'No documents found', exact: true })).toBeVisible();
  await search.fill(title);
  const article = maya.page.locator('article').filter({ hasText: title }).first();
  await article.locator('summary').filter({ hasText: 'Preview synthetic text' }).click();
  await expect(article.locator('pre')).toContainText('DEMO / NOT AN OFFICIAL RECORD');
  await visit(staff, '/documents', 'Documents', admin);
  await staff.page.getByLabel('Search records', { exact: true }).fill(title);
  const row = staff.page.getByRole('row').filter({ hasText: title });
  await expect(row).toContainText('SUBMITTED');
  await row.getByRole('button', { name: 'Approve', exact: true }).click();
  await staff.page.getByLabel('Reason or operator note').fill('Synthetic bounded separate-actor review. No external storage.');
  await staff.page.getByRole('button', { name: 'Confirm action', exact: true }).click();
  await expect(row).toContainText('APPROVED');
  report.mutations.push({ cell: active, type: 'document approve', title, actor: 'system-admin' });
  await maya.page.reload({ waitUntil: 'domcontentloaded' });
  await expect(maya.page.locator('article').filter({ hasText: title }).first()).toContainText('Approved');
  await visit(noah, '/documents', 'Documents');
  const records = await api(noah, '/me/demo-records');
  expect(records.documents.some(d => d.title === title)).toBe(false);
  await expect(noah.page.locator('article').filter({ hasText: title })).toHaveCount(0);
  await shot(maya, 'shared-approved-document');
}
async function J4({ maya, noah }) {
  await visit(maya, '/digital-id', 'RHC Digital ID');
  await expect(maya.page.getByText('RHC-2026-00000001', { exact: true }).first()).toBeVisible();
  const mayaId = await api(maya, '/me/rhc-id');
  expect(mayaId.public_reference).toBeTruthy();
  await visit(noah, '/digital-id', 'RHC Digital ID');
  await expect(noah.page.getByRole('img', { name: 'Non-scannable verification reference placeholder' })).toBeVisible();
  await expect(noah.page.getByRole('button', { name: 'Public verification unavailable', exact: true })).toBeDisabled();
  await expect(noah.page.getByRole('button', { name: 'Issue RHC Digital ID', exact: true })).toHaveCount(0);
  const noahId = await api(noah, '/me/rhc-id');
  expect(noahId.rhc_id).toBeNull(); expect(noahId.public_reference).toBeNull();
  await api(noah, '/me/rhc-id', 'POST', {}, 409);
  const submit = noah.page.getByRole('button', { name: 'Submit identity review', exact: true });
  if (await submit.count()) {
    await submit.click();
    await expect(noah.page.getByRole('status').filter({ hasText: 'Synthetic identity review submitted.' })).toBeVisible();
    report.mutations.push({ cell: active, type: 'identity review submit', actor: 'customer-noah' });
  }
  await expect(noah.page.getByText('Business review pending', { exact: true })).toBeVisible();
  await shot(noah, 'pending-review-unavailable-qr');
  for (const a of [maya, noah]) {
    await visit(a, '/rhc-points', 'RHC Rewards');
    const records = await api(a, '/me/demo-records');
    await expect(metric(a.page, 'Available points')).toHaveText(records.rewards.balance.toLocaleString('en-US'));
    await expect(a.page.getByText('They are not cryptocurrency', { exact: false })).toBeVisible();
    log('ledger-check', { actor: a.name, balance: records.rewards.balance, entries: records.rewards.entries.length });
  }
}
async function layout(a, width) {
  await a.page.setViewportSize({ width, height: 900 });
  expect(await a.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await a.page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe('auto');
  const skip = a.page.getByRole('link', { name: 'Skip to main content' });
  const target = new URL(a.page.url()).origin === admin ? '#admin-main-content' : '#main-content';
  await expect(skip).toHaveAttribute('href', target);
  await skip.focus(); await a.page.keyboard.press('Enter');
  await expect(a.page.locator(target)).toBeFocused();
  await shot(a, a.name + '-' + width);
}
async function J5({ maya, staff, publicActor }) {
  for (const [reference, state] of [['demo-passport-maya-7d2f0f9a', 'VALID'], ['demo-passport-revoked-449ad0cb', 'REVOKED']]) {
    await visit(publicActor, '/verify/rhc-id/' + reference, 'Public Verification Result');
    await expect(publicActor.page.getByText(state, { exact: true }).first()).toBeVisible();
    await expect(publicActor.page.locator('main')).not.toContainText('Maya Santos');
    await expect(publicActor.page.locator('main')).not.toContainText('maya.santos@example.test');
  }
  await visit(publicActor, '/', /One identity.*One ecosystem/i);
  await layout(publicActor, 390);
  await publicActor.page.locator('header summary').focus(); await publicActor.page.keyboard.press('Enter');
  const nav = publicActor.page.getByRole('navigation', { name: 'Mobile public navigation' });
  await expect(nav).toBeVisible(); await nav.getByRole('link', { name: /Marketplace/i }).click();
  await expect(publicActor.page).toHaveURL(customer + '/marketplace');
  await visit(maya, '/dashboard', 'My RHC Dashboard');
  for (const width of [390, 768, 1440]) await layout(maya, width);
  const trigger = maya.page.getByRole('button', { name: /^Navigate\b/ });
  await expect(trigger).toHaveAccessibleName(/Navigate.*Ctrl K/);
  await expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
  await trigger.click();
  const dialog = maya.page.getByRole('dialog', { name: 'Command menu' });
  await expect(dialog.getByRole('searchbox')).toBeFocused();
  const last = dialog.getByRole('link').last(); const close = dialog.getByRole('button', { name: 'Close command menu' });
  await last.focus(); await maya.page.keyboard.press('Tab'); await expect(close).toBeFocused();
  await maya.page.keyboard.press('Shift+Tab'); await expect(last).toBeFocused();
  await maya.page.keyboard.press('Escape'); await expect(dialog).toHaveCount(0); await expect(trigger).toBeFocused();
  await maya.page.setViewportSize({ width: 390, height: 900 });
  await expect(maya.page.getByRole('navigation', { name: 'Mobile navigation', exact: true })).toBeVisible();
  await maya.page.getByRole('button', { name: 'Sign out', exact: true }).filter({ visible: true }).click();
  await maya.page.waitForURL(customer + '/login');
  await maya.page.goto(customer + '/profile', { waitUntil: 'domcontentloaded' });
  await expect(maya.page).toHaveURL(customer + '/login');
  await expect(maya.page.getByRole('button', { name: 'Save profile', exact: true })).toHaveCount(0);
  await visit(staff, '/', 'Command Center', admin);
  await layout(staff, 390);
}
async function bounded(fn) {
  let timer;
  try { return await Promise.race([fn(), new Promise((_, reject) => { timer = setTimeout(() => { halted = true; reject(Error('TIMEOUT: cell exceeded 75000ms; remaining cells NOT RUN')); }, 75000); })]); }
  finally { clearTimeout(timer); }
}
async function run() {
  if (!out || process.env.DEMO_EXACT_NETWORK !== '1' || !process.env.DEMO_OWNERSHIP_FILE || process.versions.node.split('.')[0] !== '22') throw Error('BLOCKED: use authorized Node22 supervisor only');
  b.canonical(out); b.assertOwned(3002); b.assertOwned(3003);
  persist();
  browser = await chromium.launch({ headless: true, timeout: 30000, args: [
    '--disable-background-networking', '--disable-component-update', '--disable-default-apps', '--disable-extensions', '--disable-sync', '--no-first-run',
    '--disable-domain-reliability', '--safebrowsing-disable-auto-update', '--disable-client-side-phishing-detection',
    '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1', '--force-webrtc-ip-handling-policy=disable_non_proxied_udp',
  ] });
  report.browserRuntime = { launcherPid: process.pid, launcherExecPath: process.execPath, launcherNode: process.version,
    browserVersion: browser.version(), browserExecutable: chromium.executablePath() };
  log('browser-runtime', report.browserRuntime);
  // Browser launch creates a fresh temporary profile; no persistent user profile is reused.
  if (plan.includeSupplemental) {
  active = 'baseline-unsupported';
  const baseline = await actor('baseline');
  try {
    await login(baseline, 'customer-maya');
    await visit(baseline, '/future-technology');
    await expect(baseline.page.getByRole('region', { name: 'Read-only Web3 result' })).toContainText('SYNTHETIC DEMO');
    const field = label => baseline.page.locator('dl > div').filter({ has: baseline.page.locator('dt').filter({ hasText: new RegExp('^' + label + '$') }) }).locator('dd');
    await expect(field('Cap')).toBeVisible();
    await expect(field('Cap')).toContainText('Not supported by this read interface');
    await expect(field('Cap').locator('span')).toHaveText('unsupported');
    await expect(field('Paused flag')).toBeVisible();
    await expect(field('Paused flag')).toContainText('No observation available');
    await expect(field('Paused flag').locator('span')).toHaveText('unavailable');
    report.supplemental.push({ name: active, status: 'PASS' });
  } catch (error) {
    report.supplemental.push({ name: active, status: 'FAIL', error: redact(error.stack) });
    await shot(baseline, 'failure').catch(e => log('screenshot-failure', { error: redact(e.message) }));
  }
  finally { await baseline.context.close(); persist(); }
  const races = require('./races.cjs')({ expect, visit, login, selectPersona, shot, armDelay, log });
  for (const [name, runRace] of Object.entries(races)) {
    if (halted) break;
    active = 'real-race-' + name;
    const a = await actor(active);
    const row = { name: active, status: 'RUNNING', started: new Date().toISOString() };
    report.supplemental.push(row); persist();
    const errorStart = report.errors.length; const blockedStart = report.blocked.length;
    const gateStart = realDelays.length;
    try {
      await bounded(() => runRace(a));
      expect(report.errors.slice(errorStart), 'Real-response race has unexpected errors').toEqual([]);
      expect(report.blocked.slice(blockedStart), 'Real-response race attempted forbidden traffic').toEqual([]);
      row.status = 'PASS';
    } catch (error) {
      row.status = 'FAIL'; row.error = redact(error.stack);
      await shot(a, 'failure').catch(e => log('screenshot-failure', { error: redact(e.message) }));
    } finally {
      for (const gate of realDelays.slice(gateStart)) gate.release();
      await a.context.close();
      row.delays = realDelays.slice(gateStart).flatMap(gate => gate.entries);
      row.finished = new Date().toISOString(); persist();
    }
  }
  } else {
    report.supplemental = ['baseline-unsupported', 'real-race-verifier', 'real-race-pendingSwitch', 'real-race-pendingLogout']
      .map(name => ({ name, status: 'NOT RUN', reason: 'Not selected; prior supplemental evidence is preserved separately' }));
    persist();
  }
  const journeys = { J1, J2, J3, J4, J5 };
  for (const failure of matrix.failures.filter(f => plan.selectedCells.some(c => c.failure === f.id))) {
    if (halted) break;
    mode = failure.id;
    const group = { maya: await actor('maya'), noah: await actor('noah'), staff: await actor('staff'), publicActor: await actor('public') };
    let authenticated = false;
    try {
      if (plan.targeted) {
        active = 'targeted-persona-setup';
        const setup = { name: active, status: 'RUNNING', started: new Date().toISOString() };
        report.setup.push(setup); persist();
        const errorsBefore = report.errors.length; const blockedBefore = report.blocked.length;
        try {
          await bounded(async () => {
            await login(group.maya, 'customer-maya');
            await login(group.noah, 'customer-noah');
            await login(group.staff, 'system-admin', admin);
            expect(report.errors.slice(errorsBefore), 'Unexpected setup errors').toEqual([]);
            expect(report.blocked.slice(blockedBefore), 'Forbidden setup traffic').toEqual([]);
          });
          authenticated = true; setup.status = 'PASS';
        } catch (error) {
          setup.status = 'FAIL'; setup.error = redact(error.stack);
          for (const a of Object.values(group)) await shot(a, a.name + '-setup-failure').catch(e => log('screenshot-failure', { error: redact(e.message) }));
          for (const cell of report.cells.filter(c => includes(plan, c))) {
            cell.status = 'BLOCKED'; cell.reason = 'Required supported targeted persona setup failed';
          }
        } finally { setup.finished = new Date().toISOString(); persist(); }
      }
      for (const journey of matrix.journeys.filter(j => includes(plan, { journey: j.id, failure: mode }))) {
        if (halted) break;
        active = journey.id + '-' + mode;
        const cell = report.cells.find(c => c.journey === journey.id && c.failure === mode);
        if (journey.id !== 'J1' && !authenticated) { cell.status = 'BLOCKED'; cell.reason = plan.targeted ? 'Required supported targeted persona setup failed' : 'Supported login setup failed in J1'; persist(); continue; }
        cell.started = new Date().toISOString(); cell.status = 'RUNNING'; persist();
        const errorStart = report.errors.length; const blockedStart = report.blocked.length; const injectionStart = injections.length;
        try {
          await bounded(async () => {
            if (journey.id === 'J1') {
              await login(group.maya, 'customer-maya'); await login(group.noah, 'customer-noah'); await login(group.staff, 'system-admin', admin); authenticated = true;
            }
            await outage(group.maya); await outage(group.staff, true);
            await journeys[journey.id](group);
            expect(report.errors.slice(errorStart), 'Unexpected failures retained in evidence').toEqual([]);
            expect(report.blocked.slice(blockedStart), 'Network boundary blocked unexpected traffic').toEqual([]);
          });
          cell.status = 'PASS';
        } catch (error) {
          cell.status = 'FAIL'; cell.error = redact(error.stack);
          for (const a of Object.values(group)) await shot(a, a.name + '-failure').catch(e => log('screenshot-failure', { error: redact(e.message) }));
        } finally { cell.injections = injections.slice(injectionStart); cell.finished = new Date().toISOString(); persist(); }
      }
    } finally { for (const a of Object.values(group)) await a.context.close(); }
  }
  const selectedPassed = report.cells.filter(c => includes(plan, c)).every(c => c.status === 'PASS');
  const excludedUntouched = report.cells.filter(c => !includes(plan, c)).every(c => c.status === 'NOT RUN');
  const supplementalOK = report.supplemental.every(c => c.status === (plan.includeSupplemental ? 'PASS' : 'NOT RUN'));
  report.status = selectedPassed && excludedUntouched && !report.errors.length && !report.blocked.length && supplementalOK
    ? (plan.targeted ? 'PASS (selected 2 cells only; 13 NOT RUN; separate fresh store)' : 'PASS (matrix only; explicit gaps remain)') : 'INCOMPLETE / FAIL';
  if (!report.status.startsWith('PASS')) process.exitCode = 1;
}
run().catch(error => { report.status = 'BLOCKED / FAILED'; report.fatal = redact(error.stack); process.exitCode = 2; }).finally(async () => {
  // Supervisor remains the hard deadline/owned-tree cleanup backstop if Chromium hangs.
  for (const gate of realDelays) gate.release();
  for (const context of contexts) await context.close().catch(e => log('context-close-failure', { error: redact(e.message) }));
  if (browser) await browser.close().catch(e => log('browser-close-failure', { error: redact(e.message) }));
  report.finished = new Date().toISOString();
  report.additionalCoverage = matrix.additionalCoverage.map(item => item.check ? {
    ...item,
    status: report.supplemental.find(row => row.name === item.check)?.status || 'NOT RUN',
  } : item.name !== 'Unavailable QR' ? item : {
    ...item,
    status: report.cells.some(c => c.journey === 'J4' && c.status === 'PASS') ? 'PASS' : 'NOT CONFIRMED',
    reason: 'Natural Noah credential case; consult individual J4 outcomes and pending-review-unavailable-qr screenshots. No QR failure injection.',
  });
  if (out) persist();
});
