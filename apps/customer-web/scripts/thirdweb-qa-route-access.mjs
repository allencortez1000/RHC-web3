import assert from 'node:assert/strict';
import { chromium } from 'playwright';

/**
 * Browser-level route boundary regression. Requires an already-authorized local
 * QA server with its public Client ID configured. No RHC login, wallet pairing,
 * credentials, synthetic API fixture, or thirdweb network response is injected.
 * All non-loopback network requests are blocked in this isolated test browser.
 *
 * Run explicitly: node apps/customer-web/scripts/thirdweb-qa-route-access.mjs http://127.0.0.1:3002
 */
const input = process.argv[2];
if (!input) throw new Error('Provide the authorized local QA server URL explicitly.');
const base = new URL(input);
assert.equal(base.protocol, 'http:');
assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname));
assert.equal(base.username + base.password + base.search + base.hash, '');
assert.equal(base.pathname, '/');

const assertions = [];
const blockedHosts = new Set();
const runtimeErrors = [];
function check(name, condition) {
  assertions.push({ name, result: condition ? 'PASS' : 'FAIL' });
  assert.ok(condition, name);
}
const browser = await chromium.launch({
  ...(process.platform === 'win32'
    ? { executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' }
    : {}),
  headless: true,
  args: ['--disable-background-networking', '--disable-component-update'],
});
try {
  const context = await browser.newContext({ serviceWorkers: 'block' });
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin === base.origin) return route.continue();
    blockedHosts.add(url.hostname);
    return route.abort();
  });
  const page = await context.newPage();
  page.on('pageerror', () => runtimeErrors.push('Browser runtime error; details omitted from receipt.'));
  await page.goto(new URL('/thirdweb-qa', base).href, { waitUntil: 'domcontentloaded', timeout: 60000 });
  const panel = page.locator('[data-rhc-thirdweb-qa="local-real-sdk"]');
  await panel.waitFor({ state: 'visible', timeout: 30000 });
  await page.locator('[data-qa-hydrated="true"]').waitFor({ state: 'visible', timeout: 30000 });
  check('Authorized local provider QA does not redirect to RHC login', new URL(page.url()).pathname === '/thirdweb-qa');
  check('Actual SDK provider UI renders without an RHC session', await panel.isVisible());
  check('Connection control is available but never clicked by this test', await page.locator('[data-qa-connect-primary]').isEnabled());
  check('No wallet is connected by route rendering', (await page.locator('[data-qa-wallet-address]').innerText()) === 'Not connected');
  check('Disconnect is disabled with no wallet', !(await page.getByRole('button', { name: 'Disconnect test wallet', exact: true }).isEnabled()));

  for (const pathname of ['/account', '/dashboard']) {
    await page.goto(new URL(pathname, base).href, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForURL(url => url.pathname === '/login', { timeout: 15000 });
    check('Unchanged authentication guard on ' + pathname, new URL(page.url()).pathname === '/login');
  }
  await page.goto(new URL('/thirdweb-qa', base).href, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await panel.waitFor({ state: 'visible', timeout: 30000 });
  check('QA route remains available after protected-route denial', new URL(page.url()).pathname === '/thirdweb-qa');
  check('No uncaught browser runtime error', runtimeErrors.length === 0);
  console.log(JSON.stringify({
    schema: 'rhc-local-thirdweb-route-boundary-v1',
    atUtc: new Date().toISOString(),
    assertions,
    passed: assertions.filter(x => x.result === 'PASS').length,
    failed: assertions.filter(x => x.result === 'FAIL').length,
    blockedExternalHosts: [...blockedHosts].sort(),
    realWalletConnected: false,
    providerAuthenticationAttempted: false,
    rhcSessionCreated: false,
    qualification: 'Actual local route/browser regression, not successful live-provider connection or RHC wallet linking.',
  }, null, 2));
  await context.close();
} finally {
  await browser.close();
}
