'use strict';
// W1 isolated file:// browser harness: never serves or changes an existing app route.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const ROOT = 'C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-frontend-web3';
const EVIDENCE = 'C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-frontend-web3-evidence/w1-run-20261009T025342Z';
require(path.join(ROOT, 'apps/customer-web/tests/offline-network.cjs'));
const esbuild = require(require.resolve('esbuild', { paths: [ROOT] }));
const { chromium } = require(require.resolve('playwright', { paths: [ROOT] }));
let browser;

before(async () => {
  assert.equal(fs.existsSync(path.join(EVIDENCE, 'harness.entry.tsx')), false, 'Unexpected legacy fixture name');
  await esbuild.build({
    entryPoints: [path.join(EVIDENCE, 'harness-entry.tsx')],
    outfile: path.join(EVIDENCE, 'harness.bundle.js'),
    bundle: true,
    platform: 'browser',
    format: 'iife',
    nodePaths: [path.join(ROOT, 'node_modules')],
    jsx: 'automatic',
    sourcemap: false,
    minify: false,
    legalComments: 'none',
    logLevel: 'silent',
    write: true,
  });
  browser = await chromium.launch({
    headless: true,
    args: ['--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1, EXCLUDE localhost'],
  });
});

after(async () => { if (browser) await browser.close(); });

async function fixturePage(options = {}) {
  const ctx = await browser.newContext({
    viewport: options.viewport ?? { width: 1200, height: 840 },
    reducedMotion: 'reduce',
    serviceWorkers: 'block',
    offline: true,
  });
  const denied = [];
  await ctx.route('**/*', (route) => {
    const url = route.request().url();
    // Never authorize RPC, Thirdweb, API, loopback or another file root.
    if (url.startsWith(pathToFileURL(EVIDENCE + '/').href)) return route.continue();
    denied.push(url.replace(/([?#]).*$/, ''));
    return route.abort('blockedbyclient');
  });
  const page = await ctx.newPage();
  await page.goto(pathToFileURL(path.join(EVIDENCE, 'harness.html')).href);
  await page.locator('[data-wallet-mode="synthetic-offline"]').waitFor();
  return { page, ctx, denied };
}

async function status(page, expected) {
  await page.waitForFunction((value) => document.querySelector('[data-wallet-mode]')?.getAttribute('data-wallet-status') === value, expected, { timeout: 4000 });
}

test('W1-UI-01 keyboard-activated connect, accessible status, and no false backend link', async () => {
  const { page, ctx, denied } = await fixturePage();
  try {
    const btn = page.getByRole('button', { name: 'Connect synthetic wallet', exact: true });
    await btn.focus();
    assert.equal(await btn.evaluate((e) => e === document.activeElement), true);
    await page.keyboard.press('Enter');
    await status(page, 'connected');
    assert.match(await page.getByTestId('wallet-address').innerText(), /^0x[a-f0-9]{40}$/i);
    assert.match(await page.getByTestId('wallet-link').innerText(), /unknown.*never verified/);
    assert.match(await page.getByRole('status').first().innerText(), /Synthetic wallet connected/);
    const disconnectButton = page.getByRole('button', { name: 'Disconnect synthetic wallet', exact: true });
    assert.equal(await disconnectButton.isEnabled(), true);
    await page.waitForFunction(() => document.activeElement?.textContent?.trim() === 'Disconnect synthetic wallet');
    await disconnectButton.click();
    await status(page, 'disconnected');
    await page.waitForFunction(() => document.activeElement?.textContent?.trim() === 'Connect synthetic wallet');
    assert.deepEqual(denied, []);
  } finally { await ctx.close(); }
});

test('W1-UI-02 cancellation keeps address hidden after a delayed adapter result', async () => {
  const { page, ctx, denied } = await fixturePage();
  try {
    await page.getByRole('button', { name: 'Connect synthetic wallet', exact: true }).click();
    await status(page, 'connecting');
    await page.getByRole('button', { name: 'Cancel connection' }).click();
    await status(page, 'disconnected');
    await page.waitForFunction(() => document.activeElement?.textContent?.trim() === 'Connect synthetic wallet');
    await page.waitForTimeout(150);
    assert.equal(await page.getByTestId('wallet-address').innerText(), 'Not connected');
    const released = await page.evaluate(() => window.__W1_TRACE.releases.slice());
    assert.deepEqual(released, ['synthetic:browser-1']);
    assert.deepEqual(denied, []);
  } finally { await ctx.close(); }
});

test('W1-UI-03 customer switching and logout clear previous address immediately', async () => {
  const { page, ctx, denied } = await fixturePage();
  try {
    await page.getByRole('button', { name: 'Connect synthetic wallet', exact: true }).click();
    await status(page, 'connected');
    await page.getByRole('button', { name: 'Switch fixture account' }).click();
    await status(page, 'disconnected');
    assert.equal(await page.getByTestId('wallet-address').innerText(), 'Not connected');
    await page.getByRole('button', { name: 'Fixture logout' }).click();
    await status(page, 'unavailable');
    assert.equal(await page.getByTestId('wallet-address').innerText(), 'Not connected');
    assert.deepEqual(denied, []);
  } finally { await ctx.close(); }
});

test('W1-UI-04 disabled policy makes no synthetic adapter connection', async () => {
  const { page, ctx, denied } = await fixturePage();
  try {
    await page.getByRole('button', { name: 'Disable synthetic wallet' }).click();
    await status(page, 'unavailable');
    assert.equal(await page.getByRole('button', { name: 'Connect synthetic wallet', exact: true }).isDisabled(), true);
    assert.equal(await page.evaluate(() => window.__W1_TRACE.connects), 0);
    assert.deepEqual(denied, []);
  } finally { await ctx.close(); }
});

test('W1-UI-05 unsupported chain blocks adapter and displays unsupported', async () => {
  const { page, ctx, denied } = await fixturePage();
  try {
    await page.getByRole('button', { name: 'Unsupported synthetic chain' }).click();
    await status(page, 'unavailable');
    assert.equal(await page.getByTestId('wallet-chain').innerText(), 'unsupported');
    assert.equal(await page.evaluate(() => window.__W1_TRACE.connects), 0);
    assert.deepEqual(denied, []);
  } finally { await ctx.close(); }
});

test('W1-UI-06 375px mobile layout, reduced motion, and no horizontal overflow', async () => {
  const { page, ctx, denied } = await fixturePage({ viewport: { width: 375, height: 750 } });
  try {
    assert.equal(await page.emulateMedia({ reducedMotion: 'reduce' }).then(() => page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)), true);
    const widths = await page.evaluate(() => ({ viewport: window.innerWidth, body: document.body.scrollWidth, doc: document.documentElement.scrollWidth }));
    assert.ok(widths.doc <= widths.viewport, JSON.stringify(widths));
    assert.equal(await page.getByText('SYNTHETIC OFFLINE TEST — NOT A LIVE WALLET').isVisible(), true);
    assert.equal(await page.getByRole('button', { name: 'Connect synthetic wallet', exact: true }).isVisible(), true);
    assert.deepEqual(denied, []);
  } finally { await ctx.close(); }
});

test('W1-UI-07 reload does not persist a synthetic wallet address or backend link', async () => {
  const { page, ctx, denied } = await fixturePage();
  try {
    await page.getByRole('button', { name: 'Connect synthetic wallet', exact: true }).click();
    await status(page, 'connected');
    await page.reload();
    await status(page, 'disconnected');
    assert.equal(await page.getByTestId('wallet-address').innerText(), 'Not connected');
    assert.match(await page.getByTestId('wallet-link').innerText(), /unknown.*never verified/);
    const storage = await page.evaluate(() => {
      try {
        return [...Object.keys(window.localStorage), ...Object.keys(window.sessionStorage)]
          .filter((key) => /rhc.*wallet|wallet-foundation|synthetic:browser/i.test(key));
      } catch { return []; /* file:// browsers can disallow storage access */ }
    });
    assert.deepEqual(storage, []);
    assert.deepEqual(denied, []);
  } finally { await ctx.close(); }
});
