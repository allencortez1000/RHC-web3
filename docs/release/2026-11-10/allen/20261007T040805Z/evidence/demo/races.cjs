'use strict';
// Only supported UI transitions and narrow timing holds of actual hub responses.
const customer = 'http://127.0.0.1:3002';
const qrName = 'QR code for the privacy-safe RHC verification page';
module.exports = function raceChecks({ expect, visit, login, selectPersona, shot, armDelay, log }) {
  async function marker(a) {
    return a.page.evaluate(() => { window.__ownedDemoDocument = crypto.randomUUID(); return window.__ownedDemoDocument; });
  }
  async function sameDocument(a, mark) {
    expect(await a.page.evaluate(() => window.__ownedDemoDocument), 'Race must not silently become a full-document reload test').toBe(mark);
  }
  async function held(gate, paths) {
    for (const p of paths) await expect.poll(() => gate.entries.some(e => e.path === p && e.status === 'HELD'), { timeout: 9000 }).toBe(true);
  }
  async function released(gate) {
    gate.release();
    await expect.poll(() => gate.entries.length > 0 && gate.entries.every(e => ['RELEASED_UNCHANGED', 'BROWSER_CANCELLED'].includes(e.status)), { timeout: 10000 }).toBe(true);
    expect(gate.entries.some(e => e.expired)).toBe(false);
    log('race-delivery', { name: gate.name, deliveries: gate.entries.map(e => ({ path: e.path, status: e.status, sha256: e.sha256 })) });
  }
  async function enterReference(a, reference) {
    await a.page.getByRole('textbox', { name: 'Opaque reference or verification URL' }).fill(reference);
    await a.page.getByRole('button', { name: 'Check credential', exact: true }).click();
    await expect(a.page).toHaveURL(customer + '/verify/rhc-id/' + reference);
  }
  async function noMaya(a) {
    // The supported public login chooser legitimately lists source persona names.
    // It must not be mistaken for a leaked protected profile after logout.
    if (new URL(a.page.url()).pathname !== '/login') {
      await expect(a.page.locator('main')).not.toContainText('Maya Santos');
      await expect(a.page.locator('main')).not.toContainText('maya.santos@example.test');
    } else {
      await expect(a.page.getByRole('heading', { name: 'User Profile', exact: true })).toHaveCount(0);
      await expect(a.page.getByRole('button', { name: 'Save profile', exact: true })).toHaveCount(0);
    }
    await expect(a.page.getByText('RHC-2026-00000001', { exact: true })).toHaveCount(0);
    await expect(a.page.getByRole('img', { name: qrName, exact: true })).toHaveCount(0);
    await expect(a.page.locator('a[href*="demo-passport-maya-7d2f0f9a"]')).toHaveCount(0);
  }
  async function settle(a) {
    // Short bounded observation after the actual release, not an arbitrary long sleep
    // substituted for request evidence. Assert again after React has had frames to render.
    await a.page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await a.page.waitForTimeout(200);
  }
  async function verifier(a) {
    await login(a, 'customer-maya');
    // Warm both routes before the 8s response-hold window. These are normal real reads.
    await visit(a, '/verify/rhc-id/demo-passport-revoked-449ad0cb', 'Public Verification Result');
    await expect(a.page.getByText('REVOKED', { exact: true }).first()).toBeVisible();
    await visit(a, '/verify/rhc-id/demo-passport-maya-7d2f0f9a', 'Public Verification Result');
    await expect(a.page.getByText('VALID', { exact: true }).first()).toBeVisible();
    await visit(a, '/rhc-verify');
    const mark = await marker(a);
    const endpoint = '/api/demo/verify/rhc-id/demo-passport-maya-7d2f0f9a';
    const gate = armDelay(a, [endpoint], 'real-verifier-A-late');
    try {
      await enterReference(a, 'demo-passport-maya-7d2f0f9a');
      await held(gate, [endpoint]);
      await expect(a.page.getByRole('status').filter({ hasText: 'Loading records' })).toBeVisible();
      await a.page.goBack({ waitUntil: 'domcontentloaded' });
      await expect(a.page).toHaveURL(customer + '/rhc-verify');
      await enterReference(a, 'demo-passport-revoked-449ad0cb');
      await expect(a.page.getByText('REVOKED', { exact: true }).first()).toBeVisible();
      await sameDocument(a, mark);
      await released(gate);
      await settle(a);
      await expect(a.page.getByText('REVOKED', { exact: true }).first()).toBeVisible();
      await expect(a.page.getByText('VALID', { exact: true })).toHaveCount(0);
      await noMaya(a);
      await shot(a, 'B-stable-after-real-A-release');
    } finally { gate.release(); }

    // NOT FOUND comes from the real hub; UNAVAILABLE is the product's own legacy-ID
    // refusal. Neither status is invented by the harness, and no QR is fabricated.
    await a.page.goBack({ waitUntil: 'domcontentloaded' });
    await enterReference(a, 'demo-passport-not-found');
    await expect(a.page.getByRole('heading', { name: 'Verification reference not found', exact: true })).toBeVisible();
    await expect(a.page.getByText('Masked holder', { exact: true })).toHaveCount(0);
    await expect(a.page.getByText('REVOKED', { exact: true })).toHaveCount(0);
    await noMaya(a);
    await shot(a, 'real-not-found-no-stale-result');
    await a.page.goBack({ waitUntil: 'domcontentloaded' });
    const legacy = Buffer.from('RHC-2026-00000001').toString('base64url');
    let lookups = 0;
    const observe = req => { if (new URL(req.url()).pathname.startsWith('/api/demo/verify/rhc-id/')) lookups++; };
    a.page.on('request', observe);
    try {
      await enterReference(a, legacy);
      await expect(a.page.getByRole('heading', { name: 'Public Verification Unavailable', exact: true })).toBeVisible();
      await expect(a.page.getByText('No identifier was looked up and no customer identity data is displayed.', { exact: false })).toBeVisible();
      await settle(a); expect(lookups).toBe(0);
      await expect(a.page.getByText('Masked holder', { exact: true })).toHaveCount(0);
      await noMaya(a); await sameDocument(a, mark);
      await shot(a, 'unavailable-without-lookup-or-stale-result');
    } finally { a.page.off('request', observe); }
  }
  async function pendingAccount(a, switchPersona) {
    await login(a, 'customer-maya');
    // Login warms the dashboard/login; finish on Maya's real issued Digital ID.
    await visit(a, '/digital-id', 'RHC Digital ID');
    await expect(a.page.getByRole('img', { name: qrName, exact: true })).toBeVisible();
    const mark = await marker(a);
    const paths = ['/api/demo/me', '/api/demo/me/rhc-id'];
    const gate = armDelay(a, paths, switchPersona ? 'real-account-pending-persona-switch' : 'real-account-pending-logout', a.token);
    try {
      await a.page.getByRole('button', { name: 'Refresh status', exact: true }).click();
      await held(gate, paths);
      await expect(a.page.getByRole('status').filter({ hasText: 'Loading records' }).first()).toBeVisible();
      await a.page.getByRole('button', { name: 'Sign out', exact: true }).filter({ visible: true }).click();
      await expect(a.page).toHaveURL(customer + '/login');
      await noMaya(a);
      if (switchPersona) {
        await selectPersona(a, 'customer-noah');
        await expect(a.page.getByText('Welcome back, Noah Reyes', { exact: true })).toBeVisible();
      }
      await sameDocument(a, mark);
      await released(gate);
      await settle(a); await noMaya(a);
      if (switchPersona) {
        await expect(a.page.getByText('Welcome back, Noah Reyes', { exact: true })).toBeVisible();
        await visit(a, '/digital-id', 'RHC Digital ID');
        await expect(a.page.getByRole('img', { name: 'Non-scannable verification reference placeholder' })).toBeVisible();
        await expect(a.page.getByRole('button', { name: 'Public verification unavailable', exact: true })).toBeDisabled();
        await expect(a.page.getByRole('button', { name: 'Issue RHC Digital ID', exact: true })).toHaveCount(0);
        await noMaya(a); await shot(a, 'Noah-unavailable-QR-after-late-Maya');
      } else {
        await expect(a.page).toHaveURL(customer + '/login');
        await expect(a.page.getByRole('button', { name: 'Save profile', exact: true })).toHaveCount(0);
        await shot(a, 'signed-out-after-real-account-release');
        await a.page.goto(customer + '/profile', { waitUntil: 'domcontentloaded' });
        await expect(a.page).toHaveURL(customer + '/login');
        await noMaya(a);
      }
    } finally { gate.release(); }
  }
  return { verifier, pendingSwitch: a => pendingAccount(a, true), pendingLogout: a => pendingAccount(a, false) };
};
