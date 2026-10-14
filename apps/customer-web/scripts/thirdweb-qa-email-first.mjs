import assert from 'node:assert/strict';
import { chromium } from 'playwright';

// Real local page + real SDK modal. No provider fixture, email, OTP, account or wallet is submitted.
// Requires the already-authorized local QA configuration with WALLET_MODE=both.
const input = process.argv[2];
assert.ok(input, 'Pass the authorized local QA server URL explicitly.');
const base = new URL(input);
assert.equal(base.protocol, 'http:');
assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname));
assert.equal(base.username + base.password + base.search + base.hash, '');
assert.equal(base.pathname, '/');
const results = [];
const pageErrors = [];
function check(name, condition) {
  results.push({ name, result: condition ? 'PASS' : 'FAIL' });
  assert.ok(condition, name);
}
const browser = await chromium.launch({
  ...(process.platform === 'win32' ? { executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' } : {}),
  headless: true, args: ['--disable-background-networking', '--disable-component-update'],
});
try {
  for (const width of [1280, 390, 320]) {
    const context = await browser.newContext({ viewport: { width, height: 850 }, serviceWorkers: 'block', reducedMotion: 'reduce' });
    const page = await context.newPage();
    page.on('pageerror', () => pageErrors.push('Runtime error; details intentionally not captured.'));
    await page.goto(new URL('/thirdweb-qa', base).href, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.locator('[data-qa-hydrated="true"]').waitFor({ state: 'visible', timeout: 45000 });
    const primary = page.locator('[data-qa-connect-primary="embedded-email"]');
    const advanced = page.locator('[data-qa-advanced-wallet]');
    check(width + ' email is primary', (await primary.innerText()) === 'Continue with email');
    check(width + ' no extension required', (await page.locator('[data-qa-primary-method]').innerText()).includes('not required'));
    check(width + ' external choice initially collapsed', await advanced.evaluate(x => !x.open));
    check(width + ' not connected by rendering', (await page.locator('[data-qa-wallet-address]').innerText()) === 'Not connected');
    await primary.click();
    const dialog = page.getByRole('dialog');
    const email = dialog.locator('input[type="email"]');
    await email.waitFor({ state: 'visible', timeout: 30000 });
    check(width + ' real email form is present', await email.isVisible());
    check(width + ' no email prefilled or submitted', (await email.inputValue()) === '');
    check(width + ' primary path does not offer MetaMask', (await dialog.getByText(/MetaMask/).count()) === 0);
    check(width + ' one modal and no duplicate request', (await dialog.count()) === 1 && !(await primary.isEnabled()));
    await dialog.getByRole('button', { name: 'Close', exact: true }).click();
    await dialog.waitFor({ state: 'hidden', timeout: 10000 });
    await page.waitForFunction(() => !document.querySelector('[data-qa-connect-primary]')?.disabled);
    check(width + ' cancellation restores email control', await primary.isEnabled());
    check(width + ' cancellation does not create a connection', (await page.locator('[data-qa-wallet-address]').innerText()) === 'Not connected');
    await advanced.locator('summary').click();
    check(width + ' external wallet is available only after explicit expansion', await page.locator('[data-qa-connect-external]').isVisible());
    const layout = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, width: innerWidth }));
    check(width + ' no horizontal overflow', layout.scroll <= layout.width + 1);
    if (width === 1280) {
      await page.locator('[data-qa-connect-external]').click();
      await dialog.waitFor({ state: 'visible', timeout: 20000 });
      await page.waitForFunction(() => document.querySelector('[role="dialog"]')?.textContent?.includes('MetaMask'));
      check('optional path opens MetaMask instead of email enrollment', (await dialog.innerText()).includes('MetaMask') && (await dialog.locator('input[type="email"]').count()) === 0);
      await dialog.getByRole('button', { name: 'Close', exact: true }).click();
      await dialog.waitFor({ state: 'hidden', timeout: 10000 });
      check('optional path cancel also leaves no wallet', (await page.locator('[data-qa-wallet-address]').innerText()) === 'Not connected');
    }
    await context.close();
  }
  check('no uncaught browser runtime errors', pageErrors.length === 0);
  console.log(JSON.stringify({ schema: 'rhc-embedded-first-real-ui-qa-v1', atUtc: new Date().toISOString(), results,
    passed: results.filter(x => x.result === 'PASS').length, failed: results.filter(x => x.result === 'FAIL').length,
    realSDK: true, injectedProviderFixture: false, emailSubmitted: false, OTPRequested: false, emailVerificationCompleted: false,
    newWalletCreated: false, walletConnected: false, signaturesRequested: false, transactionsSubmitted: false,
    qualification: 'Real SDK email-entry/cancel and optional external-modal UI; not successful email authentication or RHC account linking.' }, null, 2));
} finally { await browser.close(); }
