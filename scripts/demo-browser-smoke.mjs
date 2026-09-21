import { chromium, expect as playwrightExpect } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

// Run only against the main agent's already-running, isolated demo servers.
// This does not reset the world. It appends two synthetic records and review events.
const expect = playwrightExpect.configure({ timeout: 30_000 });
const widths = [390, 768, 1440, 1920];
function localOrigin(value) {
  const url = new URL(value);
  if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || url.protocol !== 'http:') {
    throw new Error('Browser acceptance is restricted to local HTTP demo servers.');
  }
  return url.origin;
}
const customer = localOrigin(process.env.RHC_DEMO_CUSTOMER_URL || 'http://127.0.0.1:3002');
const admin = localOrigin(process.env.RHC_DEMO_ADMIN_URL || 'http://127.0.0.1:3003');
const runId = new Date().toISOString().replace(/[:.]/g, '-');
const output = path.join(process.cwd(), '.rhc-demo', 'screenshots', `browser-${runId}`);
await mkdir(output, { recursive: true });
const report = {
  runId, customer, admin, widths, passed: false, checks: [], screenshots: [], mutations: [],
  consoleErrors: [], consoleWarnings: [], pageErrors: [], httpErrors: [], failedRequests: [],
  expectedResponses: [], expectedConsoleErrors: [], navigationAborts: [], externalRequests: [],
  limitations: [
    'Chromium only; screenshots are not a visual regression or contrast audit.',
    'Responsive matrix covers representative public, customer, and admin surfaces, not every route.',
    'Requires a normal seeded demo world with Maya and the published verification examples; does not reset scenarios or clock.',
    'Appends one synthetic document and service request with review events; preserves them for audit inspection.',
    'Does not exercise production auth, real providers, payments, token activation, or all RBAC/mutation permutations.',
  ],
};
let browser;
let activeCheck = 'browser startup';
const pages = new Set();
// Only the deliberately rejected credential request may generate a 401 error.
const expectedCredentialRequests = new WeakSet();
const invalidCredentialPages = new WeakSet();
const credentialPath = '/api/demo/session/credentials';
const isCredentialRequest = (request) => request.method() === 'POST' && new URL(request.url()).pathname === credentialPath;

function observe(page) {
  pages.add(page);
  page.setDefaultTimeout(30_000);
  page.setDefaultNavigationTimeout(45_000);
  page.on('console', (message) => {
    const item = { check: activeCheck, page: page.url(), message: message.text(), location: message.location() };
    if (message.type() === 'warning') report.consoleWarnings.push(item);
    if (message.type() !== 'error') return;
    if (invalidCredentialPages.has(page) &&
        item.location.url?.endsWith(credentialPath) &&
        /^Failed to load resource: the server responded with a status of 401\b/.test(item.message)) {
      report.expectedConsoleErrors.push(item);
      return;
    }
    if (item.message.includes('A tree hydrated but some attributes') && item.message.includes('style={{')) {
      report.expectedConsoleErrors.push(item);
      return;
    }
    report.consoleErrors.push(item);
  });
  page.on('pageerror', (error) => report.pageErrors.push({ check: activeCheck, page: page.url(), message: error.message }));
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) && !['data:', 'blob:', 'about:'].includes(url.protocol)) {
      report.externalRequests.push({ check: activeCheck, url: request.url() });
    }
    if (invalidCredentialPages.has(page) && isCredentialRequest(request)) expectedCredentialRequests.add(request);
  });
  page.on('response', (response) => {
    if (response.status() < 400) return;
    const item = { check: activeCheck, url: response.url(), status: response.status(), type: response.request().resourceType() };
    if (response.status() === 401 && expectedCredentialRequests.has(response.request())) report.expectedResponses.push(item);
    else report.httpErrors.push(item);
  });
  page.on('requestfailed', (request) => {
    const item = { check: activeCheck, url: request.url(), type: request.resourceType(), error: request.failure()?.errorText };
    // Next navigation and effect cleanup can cancel reads; never ignore failed images/scripts/styles.
    if (/ERR_ABORTED/.test(item.error || '') && ['document', 'fetch', 'xhr'].includes(item.type)) report.navigationAborts.push(item);
    else report.failedRequests.push(item);
  });
}
async function newPage() {
  const context = await browser.newContext({ colorScheme: 'dark', reducedMotion: 'reduce', viewport: { width: 1440, height: 1000 } });
  context.on('page', observe);
  return context.newPage();
}
async function step(label, action) {
  activeCheck = label;
  console.log(`RHC browser smoke: ${label}`);
  const started = Date.now();
  try {
    await action();
    report.checks.push({ label, passed: true, durationMs: Date.now() - started });
  } catch (error) {
    report.checks.push({ label, passed: false, durationMs: Date.now() - started, error: String(error) });
    throw error;
  }
}
async function settled(page) {
  await expect(page.getByRole('status').filter({ hasText: /Loading records/ })).toHaveCount(0);
  await expect(page.locator('[role="alert"]:not(#__next-route-announcer__)')).toHaveCount(0);
  await page.evaluate(() => document.fonts.ready);
}
async function visit(page, origin, route, heading) {
  const response = await page.goto(`${origin}${route}`, { waitUntil: 'domcontentloaded' });
  expect(response?.ok(), `Navigation failed: ${route}`).toBeTruthy();
  await expect(page.getByRole('heading', { name: heading, exact: typeof heading === 'string' }).first()).toBeVisible();
  await settled(page);
}
async function screenshot(page, name) {
  const file = `${name}.png`;
  await page.screenshot({ path: path.join(output, file), fullPage: true, animations: 'disabled' });
  report.screenshots.push(file);
}
async function healthyLayout(page, label) {
  const size = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth }));
  expect(size.document, `${label}: document overflow ${JSON.stringify(size)}`).toBeLessThanOrEqual(size.viewport + 1);
  expect(size.body, `${label}: body overflow ${JSON.stringify(size)}`).toBeLessThanOrEqual(size.viewport + 1);
  await expect(page.getByRole('main')).toHaveCount(1);
  const clipped = await page.locator('.rhc-shell, main').evaluateAll((elements) => elements
    .filter((element) => element.scrollWidth > element.clientWidth + 1)
    .map((element) => ({ tag: element.tagName, id: element.id, width: element.clientWidth, content: element.scrollWidth })));
  expect(clipped, `${label}: shell/main must not conceal horizontal overflow`).toEqual([]);
  // Scroll lazy images into view so a below-fold broken asset cannot silently pass.
  for (const image of await page.locator('img').all()) {
    if (!await image.isVisible()) continue;
    await image.scrollIntoViewIfNeeded();
    await expect.poll(() => image.evaluate((element) => element.complete && element.naturalWidth > 0), { message: `${label}: image failed to decode` }).toBe(true);
    expect(await image.getAttribute('alt'), `${label}: image missing alt attribute`).not.toBeNull();
  }
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
}
async function publicHeader(page) {
  const header = page.getByRole('banner');
  const notice = page.getByRole('note', { name: 'Demonstration environment' });
  await expect(header).toBeVisible();
  await expect(notice).toBeVisible();
  await expect(notice).toContainText('All records and service states are illustrative');
  const headerBox = await header.boundingBox();
  const noticeBox = await notice.boundingBox();
  expect(headerBox.y, 'Public header must start at the viewport top, not below a spacer/banner').toBeLessThanOrEqual(1);
  expect(headerBox.y).toBeGreaterThanOrEqual(-1);
  expect(Math.abs(noticeBox.y - headerBox.y - headerBox.height), 'Demo notice must follow the header without a gap').toBeLessThanOrEqual(1);
  const visibleNotice = await notice.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
    return element.contains(hit) && getComputedStyle(element).opacity !== '0' &&
      Boolean(document.querySelector('header')?.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING);
  });
  expect(visibleNotice, 'Notice must remain painted below the header, not CSS-hidden or overlaid').toBe(true);
}
async function matrix(page, origin, routes, prefix, isPublic = false) {
  for (const width of widths) {
    await page.setViewportSize({ width, height: width < 700 ? 900 : 1000 });
    for (const [route, heading, readyText] of routes) {
      const label = `${prefix} ${route} at ${width}px`;
      await step(label, async () => {
        await visit(page, origin, route, heading);
        if (readyText) await expect(page.getByText(readyText, { exact: true }).first()).toBeVisible();
        await healthyLayout(page, label);
        if (isPublic) await publicHeader(page);
        await screenshot(page, `${prefix}-${route.replaceAll('/', '') || 'home'}-${width}`);
      });
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
}
async function login(page, { persona, email, origin = customer, target = customer }) {
  await page.goto(`${origin}/login`, { waitUntil: 'domcontentloaded' });
  // This guard fails closed if the application is accidentally running in production/API mode.
  const enter = page.getByRole('button', { name: 'Enter selected workspace', exact: true });
  await expect(enter).toHaveAttribute('data-demo-ready', 'true');
  if (persona) {

    await page.locator(`input[name="demo_persona"][value="${persona}"]`).check();
    await enter.click();
  } else {
    await page.getByLabel('Email', { exact: true }).fill(email);
    await page.getByLabel('Password', { exact: true }).fill('Demo123456!');
    await page.getByRole('button', { name: 'Sign in to demo', exact: true }).click();
  }
  await page.waitForURL((url) => url.origin === target && url.pathname === (target === admin ? '/' : '/dashboard'));
  await expect(page.getByRole('heading', { name: target === admin ? 'Command Center' : 'My RHC Dashboard', exact: true })).toBeVisible();
  await settled(page);
}
async function logout(page, origin, protectedRoute) {
  await page.getByRole('button', { name: 'Sign out', exact: true }).filter({ visible: true }).click();
  await page.waitForURL((url) => url.pathname === '/login');
  await page.goto(`${origin}${protectedRoute}`, { waitUntil: 'commit' }).catch((error) => {
    if (!String(error).includes('ERR_ABORTED')) throw error;
  });
  await page.waitForURL((url) => url.pathname === '/login');
  await expect(page.getByRole('button', { name: 'Enter selected workspace', exact: true })).toBeVisible();
}
async function downloadText(page, trigger, filename) {
  const [download] = await Promise.all([page.waitForEvent('download'), trigger.click()]);
  expect(await download.failure()).toBeNull();
  const file = path.join(output, filename);
  await download.saveAs(file);
  return readFile(file, 'utf8');
}
async function lightTheme(page, name) {
  const toggle = page.getByRole('button', { name: /Theme preference/ });
  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (await page.locator('html').getAttribute('data-theme-preference') === 'light') break;
    await toggle.click();
  }
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await settled(page);
  await expect(page.locator('html')).toHaveAttribute('data-theme-preference', 'light');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await healthyLayout(page, name);
  await screenshot(page, name);
}

try {
  browser = await chromium.launch({ headless: true });
  const publicPage = await newPage();
  const maya = await newPage();
  const staff = await newPage();

  await matrix(publicPage, customer, [
    ['/', /A place to belong/i],
    ['/marketplace', 'Useful connections, clearly staged.'],
    ['/rhc-verify', /Verify the record/i],
  ], 'public', true);
  await matrix(publicPage, customer, [['/login', 'Choose your workspace']], 'auth');

  await step('Public keyboard navigation, skip link, and marketplace filters', async () => {
    await publicPage.setViewportSize({ width: 390, height: 900 });
    await visit(publicPage, customer, '/', /A place to belong/i);
    const skip = publicPage.getByRole('link', { name: 'Skip to main content' });
    await skip.focus();
    await publicPage.keyboard.press('Enter');
    await expect(publicPage.locator('#main-content')).toBeFocused();
    const menu = publicPage.locator('header summary');
    await menu.focus();
    await publicPage.keyboard.press('Enter');
    const nav = publicPage.getByRole('navigation', { name: 'Mobile public navigation' });
    await expect(nav).toBeVisible();
    await nav.getByRole('link', { name: /Marketplace/i }).click();
    await expect(publicPage).toHaveURL(`${customer}/marketplace`);
    await visit(publicPage, customer, '/marketplace', 'Useful connections, clearly staged.');
    await publicPage.waitForLoadState('networkidle');
    await publicPage.locator('#marketplace-search').fill('no-such-service-month1');
    await expect(publicPage.locator('#marketplace-search')).toHaveValue('no-such-service-month1');
    await expect(publicPage.getByTestId('marketplace-result-count')).toContainText('Showing 0 services');
    await expect(publicPage.getByTestId('marketplace-empty-state')).toContainText('No matching services');
    await publicPage.getByRole('button', { name: 'Clear filters', exact: true }).click();
    await expect(publicPage.getByRole('heading', { name: 'Property discovery', exact: true })).toBeVisible();
    const availability = publicPage.locator('#marketplace-availability');
    await expect(availability).toBeVisible();
    await availability.selectOption('planned');
    await expect(publicPage.getByRole('region', { name: 'Marketplace service results' })).toBeVisible();
    await expect(publicPage.getByRole('heading', { name: 'Property discovery', exact: true })).toHaveCount(0);
    await expect(publicPage.getByRole('button', { name: /^(checkout|pay|redeem|send|stake|connect wallet)$/i })).toHaveCount(0);
    await publicPage.getByRole('button', { name: 'Clear filters', exact: true }).click();
    await healthyLayout(publicPage, 'marketplace filters mobile');
    await lightTheme(publicPage, 'public-marketplace-light-390');
    await publicHeader(publicPage);
  });

  for (const state of ['Valid', 'Pending', 'Expired', 'Revoked', 'Superseded', 'Not found']) {
    await step(`Anonymous verification: ${state}`, async () => {
      await visit(publicPage, customer, '/rhc-verify', /Verify the record/i);
      await publicPage.getByRole('link', { name: new RegExp(`^${state}\\s`) }).click();
      await expect(publicPage.getByRole('heading', { name: 'Public Verification Result' })).toBeVisible();
      if (state === 'Not found') {
        await expect(publicPage.getByRole('heading', { name: 'Verification reference not found' })).toBeVisible();
      } else {
        await expect(publicPage.getByText(state.toUpperCase(), { exact: true }).first()).toBeVisible();
        await expect(publicPage.getByText('What this proves', { exact: true })).toBeVisible();
        await expect(publicPage.getByText('Masked holder', { exact: true })).toBeVisible();
      }
      await expect(publicPage.locator('main')).not.toContainText('maya.santos@example.test');
      await expect(publicPage.locator('main')).not.toContainText('Maya Santos');
      await settled(publicPage);
      await healthyLayout(publicPage, `verification ${state}`);
      await screenshot(publicPage, `verification-${state.replaceAll(' ', '-')}`);
    });
  }

  await step('Verification input rejects personal identifiers without navigation', async () => {
    await visit(publicPage, customer, '/rhc-verify', /Verify the record/i);
    await publicPage.waitForLoadState('networkidle');
    await publicPage.getByLabel('Opaque reference or verification URL').fill('maya.santos@example.test');
    await publicPage.getByRole('button', { name: 'Check credential', exact: true }).click();
    await expect(publicPage.locator('[role="alert"]:not(#__next-route-announcer__)')).toContainText('Customer names and email addresses cannot be searched');
    await expect(publicPage).toHaveURL(`${customer}/rhc-verify`);
  });

  await step('Anonymous customer and admin deep links require demo sign-in', async () => {
    for (const [page, origin, route, loginOrigin] of [[maya, customer, '/documents', customer], [staff, admin, '/reports', customer]]) {
      await page.goto(`${origin}${route}`, { waitUntil: 'domcontentloaded' });
      await expect(page).toHaveURL(`${loginOrigin}/login`);
      await expect(page.getByRole('button', { name: 'Enter selected workspace' })).toHaveAttribute('data-demo-ready', 'true');
    }
  });
  await step('Invalid credentials reject; customer credential shortcut persists through reload', async () => {
    await maya.getByLabel('Email', { exact: true }).fill('demo@rhc.local');
    await maya.getByLabel('Password', { exact: true }).fill('wrong-password');
    invalidCredentialPages.add(maya);
    try {
      const [response] = await Promise.all([
        maya.waitForResponse((response) => isCredentialRequest(response.request())),
        maya.getByRole('button', { name: 'Sign in to demo', exact: true }).click(),
      ]);
      expect(response.status()).toBe(401);
      await expect(maya.locator('[role="alert"]:not(#__next-route-announcer__)')).toContainText(/invalid|incorrect|not recognized/i);
      await expect(maya).toHaveURL(`${customer}/login`);
    } finally {
      invalidCredentialPages.delete(maya);
    }
    await login(maya, { email: 'demo@rhc.local' });
    await maya.reload({ waitUntil: 'domcontentloaded' });
    await expect(maya.getByText('Welcome back, Maya Santos', { exact: true })).toBeVisible();
  });

  await matrix(maya, customer, [
    ['/dashboard', 'My RHC Dashboard', 'Welcome back, Maya Santos'],
    ['/digital-id', 'RHC Digital ID', 'RHC-2026-00000001'],
    ['/properties', 'Explore Properties', 'My Linked Property Access'],
    ['/payment-records', 'Payment Records', 'Submit Demo Payment Evidence'],
    ['/documents', 'Documents', 'Document Center'],
    ['/ecosystem', 'RHC Ecosystem', 'Golden Thread connected map'],
    ['/help', 'Help'], ['/future-technology', 'Future Technology'],
  ], 'customer');

  for (const [route, heading] of [
    ['/account', 'My RHC Account'], ['/my-properties', 'My Properties'],
    ['/certificates', 'Certificates'], ['/project-updates', 'Project Updates'],
    ['/reservations', 'Reservations'], ['/rhc-points', 'RHC Rewards'],
    ['/profile', 'User Profile'], ['/notifications', 'Notifications'],
    ['/help', 'Help'], ['/future-technology', 'Future Technology'], ['/white-paper', 'White Paper'],
  ]) {
    await step(`Customer route ${route}`, async () => {
      await visit(maya, customer, route, heading);
      await healthyLayout(maya, route);
    });
  }

  await step('Mobile payment table is keyboard reachable and horizontally scrollable', async () => {
    await maya.setViewportSize({ width: 390, height: 900 });
    await visit(maya, customer, '/payment-records', 'Payment Records');
    const tableArea = maya.getByRole('region', { name: 'Synthetic payment records table scroll area' });
    await tableArea.focus();
    await expect(tableArea).toBeFocused();
    await maya.keyboard.press('ArrowRight');
    await expect.poll(() => tableArea.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
    await healthyLayout(maya, 'mobile payment table');
    await maya.setViewportSize({ width: 1440, height: 1000 });
  });

  await step('Digital ID QR and public verification link', async () => {
    await visit(maya, customer, '/digital-id', 'RHC Digital ID');
    await expect(maya.getByAltText('QR code for the privacy-safe RHC verification page')).toBeVisible();
    await maya.getByRole('link', { name: 'Open public verification', exact: true }).click();
    await expect(maya.getByText('VALID', { exact: true }).first()).toBeVisible();
    await expect(maya.locator('main')).not.toContainText('maya.santos@example.test');
  });

  await step('Help search and keyboard accordion', async () => {
    await visit(maya, customer, '/help', 'Help');
    await maya.getByLabel('What do you need help with?').fill('no-such-help-month1');
    await expect(maya.getByRole('heading', { name: 'No help article found' })).toBeVisible();
    await maya.getByRole('button', { name: 'Clear filters', exact: true }).click();
    const summary = maya.locator('main details summary').first();
    await summary.focus();
    await maya.keyboard.press('Enter');
    await expect(maya.locator('main details').first()).toHaveAttribute('open', '');
  });

  await step('Inactive token alias and accessible roadmap keyboard controls', async () => {
    await visit(maya, customer, '/token', 'Future Technology');
    await expect(maya).toHaveURL(`${customer}/future-technology#future-token`);
    await expect(maya.getByText(/token issuance.*not active or authorized/i)).toBeVisible();
    await expect(maya.getByRole('button', { name: /^(send|buy|swap|stake|mint|connect wallet|activate token)$/i })).toHaveCount(0);
    const tabs = maya.getByRole('tablist', { name: 'Technology roadmap phases' }).getByRole('tab');
    await tabs.first().focus();
    await maya.keyboard.press('ArrowDown');
    await expect(tabs.nth(1)).toBeFocused();
    await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
    await expect(maya.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', await tabs.nth(1).getAttribute('id'));
    await maya.keyboard.press('End');
    await expect(tabs.last()).toBeFocused();
    await maya.keyboard.press('Home');
    await expect(tabs.first()).toBeFocused();
    await maya.keyboard.press('ArrowUp');
    await expect(tabs.last()).toBeFocused();
    await lightTheme(maya, 'customer-future-technology-light');
  });

  const documentTitle = `Browser smoke document ${runId}`;
  const serviceTitle = `Browser smoke service ${runId}`;
  await step('Golden Thread selection, list/map parity, filters, and shared service submission', async () => {
    await visit(maya, customer, '/ecosystem', 'RHC Ecosystem');
    const company = maya.getByRole('button', { name: /^Select company:/ }).first();
    await company.focus();
    await maya.keyboard.press('Enter');
    await expect(company).toHaveAttribute('aria-pressed', 'true');
    const selectedName = await maya.locator('#selected-entry-title').innerText();
    await maya.getByRole('button', { name: 'List view', exact: true }).click();
    await expect(maya.locator('#selected-entry-title')).toHaveText(selectedName);
    await maya.getByRole('button', { name: 'Jump to selected details', exact: true }).click();
    await expect(maya.locator('#selected-entry-details')).toBeFocused();
    await maya.getByLabel('Search company, property, or service', { exact: true }).fill('no-such-connection-month1');
    await expect(maya.getByRole('heading', { name: 'No matching directory entries' })).toBeVisible();
    await maya.getByRole('button', { name: 'Clear filters', exact: true }).click();
    await maya.getByRole('button', { name: 'Connected map', exact: true }).click();
    await expect(maya.getByRole('heading', { name: 'Golden Thread connected map' })).toBeVisible();
    await expect(maya.locator('#service-request-service')).toBeVisible();
    await maya.locator('#service-request-service').selectOption('service-water');
    await maya.getByLabel('Request summary', { exact: true }).fill(serviceTitle);
    await maya.getByRole('button', { name: 'Create local request', exact: true }).click();
    await expect(maya.getByRole('status').filter({ hasText: 'was created in the shared demo world' })).toBeVisible();
    report.mutations.push({ kind: 'service-request', title: serviceTitle });
    await expect(maya.locator('article').filter({ hasText: serviceTitle })).toContainText('Submitted');
  });

  await step('Synthetic document upload, empty search, preview, and marked download', async () => {
    await visit(maya, customer, '/documents', 'Documents');
    await maya.getByLabel('Document title', { exact: true }).fill(documentTitle);
    await maya.getByLabel('Synthetic text file', { exact: true }).setInputFiles({
      name: 'month1-synthetic-evidence.txt', mimeType: 'text/plain',
      buffer: Buffer.from('Synthetic browser acceptance evidence only. No personal information.'),
    });
    await maya.getByRole('button', { name: 'Submit for review', exact: true }).click();
    await expect(maya.locator('article').filter({ hasText: documentTitle }).first()).toBeVisible();
    report.mutations.push({ kind: 'document', title: documentTitle });
    const search = maya.getByRole('textbox', { name: /Search title, category, property, or status/i });
    await search.fill('no-such-document-month1');
    await expect(maya.getByRole('heading', { name: 'No documents found' })).toBeVisible();
    await search.fill(documentTitle);
    const article = maya.locator('article').filter({ hasText: documentTitle }).first();
    await expect(article).toBeVisible();
    await article.locator('summary').filter({ hasText: 'Preview synthetic text' }).click();
    await expect(article.locator('pre')).toContainText('DEMO / NOT AN OFFICIAL RECORD');
    const text = await downloadText(maya, article.getByRole('link', { name: 'Download marked sample' }), 'synthetic-document.txt');
    expect(text).toContain('DEMO / NOT AN OFFICIAL RECORD');
    expect(text).toContain('Synthetic browser acceptance evidence only.');
  });

  await step('Staff persona from shared customer login reviews the customer document', async () => {
    await login(staff, { persona: 'system-admin', target: admin });
    await visit(staff, admin, '/documents', 'Documents');
    await staff.getByLabel('Search records', { exact: true }).fill(documentTitle);
    const row = staff.getByRole('row').filter({ hasText: documentTitle });
    await expect(row).toContainText('SUBMITTED');
    await row.getByRole('button', { name: 'Approve', exact: true }).click();
    await staff.getByLabel('Reason or operator note').fill('Synthetic Month 1 browser evidence reviewed by a separate actor.');
    await staff.getByRole('button', { name: 'Confirm action', exact: true }).click();
    await expect(row).toContainText('APPROVED');
    await visit(maya, customer, '/documents', 'Documents');
    await maya.getByRole('textbox', { name: /Search title, category, property, or status/i }).fill(documentTitle);
    await expect(maya.locator('article').filter({ hasText: documentTitle }).first()).toContainText('Approved');
    await screenshot(maya, 'shared-document-approved');
    await logout(staff, admin, '/documents');
  });

  await step('Scoped operator progresses service request; customer sees the event after reload', async () => {
    await login(staff, { persona: 'operator-amica', target: admin });
    await visit(staff, admin, '/service-requests', 'Service Requests');
    await staff.getByLabel('Search records', { exact: true }).fill(serviceTitle);
    const row = staff.getByRole('row').filter({ hasText: serviceTitle });
    await expect(row).toContainText('SUBMITTED');
    await row.getByRole('button', { name: 'Progress request', exact: true }).click();
    await staff.getByLabel('Next status').selectOption('ACKNOWLEDGED');
    await staff.getByLabel('Reason or operator note').fill('Synthetic request acknowledged by browser acceptance. No provider dispatched.');
    await staff.getByRole('button', { name: 'Confirm action', exact: true }).click();
    await expect(row).toContainText('ACKNOWLEDGED');
    await visit(maya, customer, '/ecosystem', 'RHC Ecosystem');
    const article = maya.locator('article').filter({ hasText: serviceTitle });
    await expect(article).toContainText('Acknowledged');
    await expect(article).toContainText('No provider dispatched.');
    await screenshot(maya, 'shared-service-acknowledged');
    await logout(staff, admin, '/service-requests');
  });

  await step('Admin credential shortcut from shared login', async () => {
    await login(staff, { email: 'superadmin@example.com', target: admin });
  });
  await matrix(staff, admin, [
    ['/', 'Command Center'], ['/reports', 'Operational Reports'],
    ['/rhc-digital-ids', 'RHC Digital IDs', 'Maya Santos'], ['/documents', 'Documents'],
  ], 'admin');
  for (const [route, heading] of [
    ['/reservations', 'Reservations'], ['/payments', 'Payments'],
    ['/service-requests', 'Service Requests'], ['/audit-logs', 'Audit Logs'],
  ]) {
    await step(`Admin route ${route}`, async () => {
      await visit(staff, admin, route, heading);
      await expect(staff.getByRole('table')).toBeVisible();
      await healthyLayout(staff, route);
    });
  }

  await step('Command-menu filter, forward/reverse focus containment, escape, and theme persistence', async () => {
    await visit(staff, admin, '/', 'Command Center');
    const trigger = staff.getByRole('button', { name: /Navigate/ });
    await trigger.click();
    const dialog = staff.getByRole('dialog', { name: 'Command menu' });
    const search = dialog.getByLabel('Search authorized destinations');
    await expect(search).toBeFocused();
    for (const key of ['Tab', 'Shift+Tab']) {
      for (let index = 0; index < 36; index += 1) {
        await staff.keyboard.press(key);
        expect(await dialog.evaluate((element) => element.contains(document.activeElement)), `${key} escaped command dialog`).toBe(true);
      }
    }
    await search.fill('no-such-destination-month1');
    await expect(dialog.getByRole('status')).toContainText('No authorized destination');
    await staff.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await staff.keyboard.press('Control+k');
    await expect(search).toBeFocused();
    await search.fill('Reports');
    await dialog.getByRole('link', { name: /Reports/ }).click();
    await expect(staff).toHaveURL(`${admin}/reports`);
    await lightTheme(staff, 'admin-reports-light');
  });
  await step('Usable operational CSV export with provenance', async () => {
    await visit(staff, admin, '/reports', 'Operational Reports');
    await expect(staff.getByRole('table')).toBeVisible();
    const csv = await downloadText(staff, staff.getByRole('button', { name: 'Export filtered CSV' }), 'operational-report.csv');
    expect(csv).toContain('DEMO — SYNTHETIC DATA');
    expect(csv).toContain('Reservations');
  });

  await step('Mobile customer logout blocks private deep links without ending independent admin session', async () => {
    await visit(maya, customer, '/dashboard', 'My RHC Dashboard');
    await maya.setViewportSize({ width: 390, height: 900 });
    await expect(maya.getByRole('navigation', { name: 'Mobile navigation', exact: true })).toBeVisible();
    await logout(maya, customer, '/profile');
    await expect(maya.getByText('RHC-2026-00000001', { exact: true })).toHaveCount(0);
    await expect(maya.getByRole('button', { name: 'Save profile', exact: true })).toHaveCount(0);
    await visit(staff, admin, '/', 'Command Center');
    await staff.setViewportSize({ width: 390, height: 900 });
    await logout(staff, admin, '/reports');
  });

  for (const [persona, email, target] of [
    ['customer-maya', 'maya.santos@example.test', customer],
    ['customer-noah', 'noah.reyes@example.test', customer],
    ['system-admin', 'elena.garcia@example.test', admin],
    ['auditor', 'ana.deleon@example.test', admin],
  ]) {
    await step(`Named persona identity and logout: ${persona}`, async () => {
      const page = await newPage();
      await login(page, { persona, target });
      await page.getByRole('button', { name: 'Demo environment — synthetic data', exact: true }).click();
      const controls = page.getByRole('dialog', { name: 'Demo environment', exact: true });
      await expect(controls.getByText(email, { exact: true })).toBeVisible();
      await controls.getByRole('button', { name: 'Close demo controls', exact: true }).click();
      if (persona === 'customer-noah') {
        await expect(page.getByText('Welcome back, Noah Reyes', { exact: true })).toBeVisible();
        await visit(page, customer, '/documents', 'Documents');
        await expect(page.locator('article').filter({ hasText: documentTitle })).toHaveCount(0);
      }
      if (persona === 'auditor') await visit(page, admin, '/audit-logs', 'Audit Logs');
      await logout(page, target, target === admin ? '/reports' : '/documents');
      await page.context().close();
    });
  }

  await step('No unexpected console, page, HTTP, failed asset, or external request errors', async () => {
    for (const key of ['consoleErrors', 'pageErrors', 'httpErrors', 'failedRequests', 'externalRequests']) {
      expect(report[key], `${key}: ${JSON.stringify(report[key], null, 2)}`).toEqual([]);
    }
  });
  report.passed = true;
} catch (error) {
  report.failure = { check: activeCheck, message: String(error), stack: error.stack };
  for (const [index, page] of [...pages].entries()) {
    if (!page.isClosed()) await screenshot(page, `failure-${index}`).catch(() => undefined);
  }
  process.exitCode = 1;
} finally {
  await browser?.close();
  await writeFile(path.join(output, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(`RHC browser smoke ${report.passed ? 'passed automated checks' : 'FAILED'}; evidence: ${output}`);
  if (report.failure) console.error(`${report.failure.check}: ${report.failure.message}`);
}
