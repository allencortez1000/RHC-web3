'use strict';
/**
 * OFF-16: offline-only Chromium acceptance of the actual Web3ReadPanel.
 * No app route, wallet SDK, backend, network, RPC, fixtures or data mutation.
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const ROOT = 'C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-w01-off16-20261010';
const W1 = 'C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-frontend-web3';
const EV = 'C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-wallet-w2a-20261009-evidence/w01-off16-correction-20261010';
require(path.join(ROOT, 'apps/customer-web/tests/offline-network.cjs'));
const esbuild = require(require.resolve('esbuild', { paths: [W1] }));
const { chromium } = require(require.resolve('playwright', { paths: [W1] }));
let browser, inputMap;

before(async () => {
  const build = await esbuild.build({
    entryPoints: [path.join(EV, 'browser-entry.tsx')],
    outfile: path.join(EV, 'browser.bundle.js'),
    bundle: true, format: 'iife', platform: 'browser', jsx: 'automatic',
    nodePaths: [path.join(W1, 'node_modules')],
    legalComments: 'none', metafile: true, minify: false,
    logLevel: 'silent', write: true,
  });
  inputMap = Object.keys(build.metafile.inputs).map(s => s.replaceAll('\\', '/'));
  assert.ok(inputMap.some(x => x.endsWith('packages/ui/src/web3-read-panel.tsx')),
    'Must bundle the real Web3 read panel; metafile paths vary with the runner working directory');
  assert.equal(inputMap.some(x => /(?:^|\/)(?:thirdweb|@thirdweb-dev)(?:\/|$)/i.test(x)), false);
  assert.deepEqual(Object.values(build.metafile.outputs).flatMap(x => x.imports.filter(i => i.external)), []);
  const bundle = fs.readFileSync(path.join(EV, 'browser.bundle.js'), 'utf8');
  for (const forbidden of ['THIRDWEB_SECRET_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'createThirdwebClient', 'sendTransaction(', 'signMessage(']) {
    assert.equal(bundle.includes(forbidden), false, 'Forbidden runtime identifier: ' + forbidden);
  }
  browser = await chromium.launch({ headless: true,
    args: ['--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1, EXCLUDE localhost'],
  });
});
after(async () => { if (browser) await browser.close(); });

async function fixture(width = 1440) {
  const ctx = await browser.newContext({
    viewport: { width, height: 800 },
    reducedMotion: 'reduce', serviceWorkers: 'block', offline: true,
  });
  const blocked = [], errors = [], consoleOutput = [];
  await ctx.route('**/*', route => {
    const url = route.request().url();
    if (url.startsWith(pathToFileURL(EV + '/').href)) return route.continue();
    blocked.push(url);
    return route.abort('blockedbyclient');
  });
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', e => consoleOutput.push(e.text()));
  await page.goto(pathToFileURL(path.join(EV, 'browser.html')).href);
  await page.waitForFunction(() => typeof window.__OFF16_SET_MODE === 'function');
  const panel = page.getByRole('region', { name: 'Read-only Web3 result' });
  return {
    page, ctx, panel,
    async finish() {
      assert.deepEqual(blocked, [], 'No external requests');
      assert.deepEqual(errors, [], 'No browser JavaScript errors');
      assert.doesNotMatch(consoleOutput.join('\n'), /THIRDWEB_SECRET_KEY|SUPABASE_SERVICE_ROLE_KEY|FAKE_PRIVATE_TEST_VALUE/);
      await ctx.close();
    },
  };
}
async function mode(page, name) {
  const old = await page.locator('main[data-off16-mode]').getAttribute('data-off16-revision');
  await page.evaluate(n => window.__OFF16_SET_MODE(n), name);
  await page.waitForFunction(
    oldRev => document.querySelector('main[data-off16-mode]')?.getAttribute('data-off16-revision') !== oldRev,
    old,
  );
  assert.equal(await page.locator('main').getAttribute('data-off16-mode'), name);
}
const snapshot = p => p.getByText('Snapshot', { exact: true }).locator('..').locator('dd');
const connection = p => p.getByText('Connection', { exact: true }).locator('..').locator('dd');
const browserFreshness = p => p.getByText('Browser freshness', { exact: true }).locator('..').locator('dd');
const expired = p => p.getByText(/Stale snapshot — retained observations are not a current successful read/i);

test('OFF16-01 previous-day last success cannot appear fresh on first hydrated display', async () => {
  const f = await fixture();
  try {
    await mode(f.page, 'old');
    await expired(f.panel).waitFor({ timeout: 2500 });
    assert.match(await snapshot(f.panel).innerText(), /^stale/);
    assert.match(await connection(f.panel).innerText(), /^degraded/);
    assert.match(await browserFreshness(f.panel).innerText(), /Expired or unverified locally/);
    assert.match(await f.panel.innerText(), /Browser freshness expired/);
  } finally { await f.finish(); }
});

test('OFF16-02 newly observed testnet becomes stale on idle tab without reload', async () => {
  const f = await fixture();
  try {
    await mode(f.page, 'recent');
    await f.page.waitForFunction(() =>
      document.querySelector('dt') && document.body.innerText.includes(
        'Within the conservative one-second freshness window'),
    );
    assert.match(await snapshot(f.panel).innerText(), /^fresh/);
    await expired(f.panel).waitFor({ timeout: 4000 });
    assert.match(await snapshot(f.panel).innerText(), /^stale/);
    assert.match(await connection(f.panel).innerText(), /^degraded/);
    assert.equal(f.page.url().startsWith('file:'), true);
  } finally { await f.finish(); }
});

test('OFF16-03 visibility-return causes immediate stale reclassification after clock advance', async () => {
  const f = await fixture();
  try {
    await mode(f.page, 'recent');
    await f.page.waitForFunction(() => document.body.innerText.includes(
      'Within the conservative one-second freshness window'));
    await f.page.evaluate(() => {
      const original = Date.now;
      Date.now = () => original() + 90000;
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await expired(f.panel).waitFor({ timeout: 1800 });
    assert.match(await snapshot(f.panel).innerText(), /^stale/);
  } finally { await f.finish(); }
});

test('OFF16-04 focus causes immediate expiration on return with throttled timer', async () => {
  const f = await fixture();
  try {
    await mode(f.page, 'recent');
    await f.page.waitForFunction(() => document.body.innerText.includes(
      'Within the conservative one-second freshness window'));
    await f.page.evaluate(() => {
      const original = Date.now;
      Date.now = () => original() + 8000;
      window.dispatchEvent(new Event('focus'));
    });
    await expired(f.panel).waitFor({ timeout: 1800 });
  } finally { await f.finish(); }
});

test('OFF16-05 expired snapshot never revives because system clock rolls backward', async () => {
  const f = await fixture();
  try {
    await mode(f.page, 'old');
    await expired(f.panel).waitFor();
    await f.page.evaluate(() => {
      Date.now = () => Date.parse('2020-01-01T00:00:00Z') + 50;
      window.dispatchEvent(new Event('focus'));
    });
    await f.page.waitForTimeout(500);
    assert.match(await snapshot(f.panel).innerText(), /^stale/);
    assert.match(await browserFreshness(f.panel).innerText(), /Expired or unverified locally/);
  } finally { await f.finish(); }
});

test('OFF16-06 new server observation resets the old expiration latch', async () => {
  const f = await fixture();
  try {
    await mode(f.page, 'old');
    await expired(f.panel).waitFor();
    await mode(f.page, 'recent');
    await f.page.waitForFunction(() => document.body.innerText.includes(
      'Within the conservative one-second freshness window'));
    assert.match(await snapshot(f.panel).innerText(), /^fresh/);
  } finally { await f.finish(); }
});

test('OFF16-07 impossible future, malformed and missing server timestamps fail closed', async () => {
  const f = await fixture();
  try {
    for (const bad of ['future', 'invalid', 'missing']) {
      await mode(f.page, bad);
      await expired(f.panel).waitFor({ timeout: 2200 });
      assert.match(await snapshot(f.panel).innerText(), /^stale/);
      assert.match(await browserFreshness(f.panel).innerText(), /Expired or unverified locally/);
    }
  } finally { await f.finish(); }
});

test('OFF16-08 valid-looking fresh snapshot without observation data is not called current', async () => {
  const f = await fixture();
  try {
    await mode(f.page, 'no-data');
    await expired(f.panel).waitFor({ timeout: 2000 });
    assert.match(await snapshot(f.panel).innerText(), /^stale/);
    assert.equal(await f.panel.getByText('Token field observations').count(), 0);
  } finally { await f.finish(); }
});

test('OFF16-09 partial payload loses freshness while preserving partial and unavailable disclosures', async () => {
  const f = await fixture();
  try {
    await mode(f.page, 'partial');
    await expired(f.panel).waitFor({ timeout: 4200 });
    assert.match(await snapshot(f.panel).innerText(), /^stale/);
    assert.match(await f.panel.innerText(), /Partial snapshot — some token fields were not observed/);
    assert.match(await f.panel.innerText(), /No observation available/);
    assert.match(await f.panel.innerText(), /PARTIAL_METADATA/);
  } finally { await f.finish(); }
});

test('OFF16-10 prior server stale and absent remain stale/absent; diagnostics unchanged', async () => {
  const f = await fixture();
  try {
    await mode(f.page, 'already-stale');
    await expired(f.panel).waitFor();
    assert.match(await f.panel.innerText(), /RATE_LIMITED/);
    assert.match(await snapshot(f.panel).innerText(), /^stale/);
    await mode(f.page, 'absent');
    assert.match(await snapshot(f.panel).innerText(), /^absent/);
    assert.match(await f.panel.innerText(), /SNAPSHOT_EXPIRED/);
    assert.equal(await expired(f.panel).count(), 0);
  } finally { await f.finish(); }
});

test('OFF16-11 disabled and synthetic never become a real blockchain observation', async () => {
  const f = await fixture();
  try {
    await mode(f.page, 'synthetic');
    assert.match(await f.panel.innerText(), /SYNTHETIC DEMO/);
    assert.equal(await f.panel.getByText('Browser freshness', { exact: true }).count(), 0);
    await mode(f.page, 'disabled');
    assert.match(await f.panel.innerText(), /No Web3 read is enabled/);
    assert.equal(await f.panel.getByText('Browser freshness', { exact: true }).count(), 0);
    assert.match(await snapshot(f.panel).innerText(), /^absent/);
  } finally { await f.finish(); }
});

test('OFF16-12 stale zero and false remain observed data, never market-price/balance claims', async () => {
  const f = await fixture();
  try {
    await mode(f.page, 'old');
    await expired(f.panel).waitFor();
    const s = await f.panel.innerText();
    assert.match(s, /Raw base units: 0/);
    assert.match(s, /Paused flag[\s\S]*false/);
    assert.match(s, /not an official RHC token/);
    assert.match(s, /Total supply is a contract-wide observation/);
    assert.match(s, /RHC Points remain a separate demo ledger/);
  } finally { await f.finish(); }
});

test('OFF16-13 role=status, no action controls, no automatic provider network', async () => {
  const f = await fixture();
  try {
    await mode(f.page, 'old');
    await expired(f.panel).waitFor();
    assert.equal(await expired(f.panel).getAttribute('role'), 'status');
    assert.equal(await f.panel.locator('button, form').count(), 0);
    assert.doesNotMatch(await f.panel.innerText(), /wallet enrollment complete|sign transaction/);
    assert.match(await f.panel.innerText(), /The UI never automatically contacts the provider/);
  } finally { await f.finish(); }
});

test('OFF16-14 responsive and reduced-motion presentation for changed status', async () => {
  for (const width of [390, 768, 1440]) {
    const f = await fixture(width);
    try {
      await mode(f.page, 'old');
      await expired(f.panel).waitFor();
      const state = await f.page.evaluate(() => ({
        inner: innerWidth, scroll: document.documentElement.scrollWidth,
        reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
      }));
      assert.ok(state.scroll <= state.inner, JSON.stringify(state));
      assert.equal(state.reduced, true);
      assert.equal(await f.panel.getByRole('link', {name: /Open testnet explorer/}).count(), 1);
    } finally { await f.finish(); }
  }
});

test('OFF16-15 browser bundle excludes SDK/credentials, document-only time guard', () => {
  assert.equal(inputMap.some(x => /(?:^|\/)(?:thirdweb|@thirdweb-dev)(?:\/|$)/i.test(x)), false);
  const contents = fs.readFileSync(path.join(ROOT, 'packages/ui/src/web3-read-panel.tsx'), 'utf8');
  assert.doesNotMatch(contents, /\bfetch\s*\(|\bXMLHttpRequest\b|new\s+WebSocket\s*\(/);
  assert.match(contents, /MIN_SUPPORTED_SERVER_TTL_MS = 1000/);
  assert.match(contents, /document\.addEventListener\('visibilitychange', recheck\)/);
  assert.match(contents, /window\.addEventListener\('focus', recheck\)/);
});
