import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import postcss from 'postcss';
import postcssImport from 'postcss-import';
import tailwindcss from 'tailwindcss';
import loadTailwindConfig from 'tailwindcss/loadConfig.js';
import autoprefixer from 'autoprefixer';
import { test } from 'node:test';
import { build } from 'esbuild';
import { chromium, expect } from '@playwright/test';
import ts from 'typescript';

const root = fileURLToPath(new URL('../', import.meta.url));
const fixturePath = new URL('../apps/customer-web/app/lib/demo/web3-fixture.ts', import.meta.url);
const fixtureCode = ts.transpileModule(await readFile(fixturePath, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const fixtureModule = { exports: {} };
new Function('exports', 'require', 'module', fixtureCode)(fixtureModule.exports, (name) => {
  throw new Error(`Demo Web3 fixture must not import a runtime dependency: ${name}`);
}, fixtureModule);
const synthetic = fixtureModule.exports.createSyntheticWeb3ReadResult('2026-09-21T10:00:00.000Z');
const sourceLabels = {
  disabled: 'Blockchain preview is not enabled.',
  synthetic: 'SYNTHETIC DEMO — No live blockchain connection.',
  thirdweb_testnet: 'TESTNET PREVIEW — Development only; not the production RHC token.',
};
const restrictionNotice = 'Contract-wide restrictions have not been verified.';
const scopeNotice = 'This preview does not offer token purchases, rewards, transfers or redemption. Market price is not established. RHC Points remain a separate demo ledger.';
const bundle = await build({
  absWorkingDir: root,
  entryPoints: ['apps/customer-web/tests/web3-browser-harness.tsx'],
  bundle: true,
  write: false,
  platform: 'browser',
  format: 'iife',
  jsx: 'automatic',
  alias: { '@rhc/ui': fileURLToPath(new URL('../packages/ui/src/index.tsx', import.meta.url)) },
  define: { 'process.env.NODE_ENV': '"production"', 'process.env.NEXT_PUBLIC_ADMIN_WEB_URL': '""' },
  metafile: true,
});
assert.ok(!Object.keys(bundle.metafile.inputs).some((file) => /(?:packages\/web3|node_modules\/(?:thirdweb|@thirdweb-dev))/.test(file.replaceAll('\\', '/'))));
for (const output of Object.values(bundle.metafile.outputs)) {
  assert.deepEqual(output.imports.filter((entry) => entry.external), [], 'No external browser runtime imports');
}
const secretIdentifiers = /THIRDWEB_SECRET_KEY|SUPABASE_SERVICE_ROLE_KEY|RHC_WEB3_RPC_URL|PRIVATE_KEY|secretKey|privateKey|service_role/i;
assert.doesNotMatch(bundle.outputFiles[0].text, secretIdentifiers, 'No server-secret identifiers in the browser bundle');

// Match the inspected app pipeline, resolving the local token import before Tailwind.
// Compile entirely in memory: no Next build, CSS output file, watcher, or listener.
const styles = {};
for (const app of ['customer-web', 'admin-web']) {
  const directory = path.join(root, 'apps', app);
  const config = loadTailwindConfig(path.join(directory, 'tailwind.config.ts'));
  const filename = path.join(directory, 'app', 'globals.css');
  const result = await postcss([
    postcssImport(),
    tailwindcss({ ...config, content: config.content.map((pattern) => path.resolve(directory, pattern).replaceAll('\\', '/')) }),
    autoprefixer(),
  ]).process(await readFile(filename, 'utf8'), { from: filename, map: false });
  assert.deepEqual(result.warnings(), [], `${app} CSS compiled without warnings`);
  assert.doesNotMatch(result.css, /@(?:import|tailwind|apply)\b/, 'All local CSS imports and Tailwind directives are resolved');
  styles[app] = result.css;
}

const explorerFixture = {
  ...synthetic,
  source: 'thirdweb_testnet',
  chain: { id: 31337, name: 'Synthetic fixture chain' },
  contractAddress: '0x' + 'a'.repeat(40),
  explorerUrl: 'https://explorer.example.test/contract/fixture',
};

// Every browser request is fulfilled or blocked in-memory, including the document.
// No listener, Next build, demo store, Supabase, API, or provider is contacted.
test('isolated read-only Web3 browser coverage', { timeout: 60000 }, async (t) => {
  const browser = await chromium.launch({ headless: true, args: ['--host-resolver-rules=MAP * ~NOTFOUND'] });
  try {
    const visit = async (options = {}) => {
      const page = await browser.newPage({ serviceWorkers: 'block', viewport: options.viewport });
      const requests = [];
      const unexpected = [];
      const errors = [];
      const consoleOutput = [];
      page.on('pageerror', (error) => { errors.push(error.message); console.error('Harness page error:', error.message); });
      page.on('console', (message) => consoleOutput.push(message.text()));
      let releaseResource = () => undefined;
      const resourceGate = options.delayResource ? new Promise((resolve) => { releaseResource = resolve; }) : Promise.resolve();
      page.on('close', () => releaseResource());
      let remainingFailures = options.failOnce ? 1 : 0;
      let account = {
        id: 'synthetic-customer', email: 'customer@example.test', account_status: 'ACTIVE',
        role: options.adminAccount || options.admin ? 'SYSTEM_ADMIN' : 'CUSTOMER',
        permissions: options.permission === false ? [] : ['integration.view'],
        company_ids: [], project_ids: [],
        ...options.account,
      };
      await page.context().route('**/*', async (route) => {
        const request = route.request();
        const url = new URL(request.url());
        if (url.origin !== 'http://web3-fixture.test') {
          unexpected.push(request.url());
          return route.abort('blockedbyclient');
        }
        if (url.pathname === '/') return route.fulfill({ contentType: 'text/html', body: `<!doctype html><html data-theme="${options.theme ?? 'dark'}"><head><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/harness.css"></head><body><main id="root" class="mx-auto max-w-7xl px-5 py-6 md:px-8 md:py-8"></main><script src="/harness.js"></script></body></html>` });
        if (url.pathname === '/harness.css') return route.fulfill({ contentType: 'text/css', body: styles[options.admin ? 'admin-web' : 'customer-web'] });
        if (url.pathname === '/harness.js') return route.fulfill({ contentType: 'text/javascript', body: bundle.outputFiles[0].text });
        requests.push({ path: url.pathname, method: request.method(), authorization: request.headers().authorization });
        if (url.pathname === '/api/auth/session') return route.fulfill({ json: { authenticated: true, user: account } });
        if (url.pathname === '/api/admin/capabilities') {
          const permissions = account.permissions || [];
          // Aggregate scope arrays are legacy fixture inputs, not production authority.
          // Explicit grants let the harness exercise valid mixed-global/scoped accounts.
          const effectiveGrants = options.grants ?? (
            !Array.isArray(account.company_ids) || !Array.isArray(account.project_ids) ? []
            : account.project_ids.length ? account.project_ids.map(project_id => ({ company_id: account.company_ids[0] ?? null, project_id }))
            : account.company_ids.length ? account.company_ids.map(company_id => ({ company_id, project_id: null }))
            : [{ company_id: null, project_id: null }]
          );
          return route.fulfill({ json: { success: true, data: {
            permissions,
            grants: { 'integration.view': permissions.includes('integration.view') ? effectiveGrants : [] },
            mutation_permissions: [], mutation_grants: {},
            modules: [{ path: '/integrations', permission: 'integration.view', usable: permissions.includes('integration.view') }],
          } } });
        }

        if (['/api/web3/token', '/api/admin/integrations/thirdweb'].includes(url.pathname)) {
          await resourceGate;
          if (options.status) return route.fulfill({ status: options.status, json: { message: 'Global read access denied by server.' } });
          if (remainingFailures-- > 0) return route.fulfill({ status: 503, json: { message: 'Synthetic read failure. Retry to recover.' } });
          return route.fulfill({ json: { success: true, data: options.result ?? synthetic } });
        }
        unexpected.push(request.url());
        return route.abort('blockedbyclient');
      });
      await page.goto(`http://web3-fixture.test/?view=${options.admin ? 'admin' : 'customer'}${options.authenticated ? '&authenticated=1' : ''}`);
      try {
        await expect(page.getByRole('heading', { name: options.admin ? 'Integrations' : 'Public roadmap', exact: true })).toBeVisible();
      } catch (cause) {
        console.error('Harness bootstrap diagnostics:', { errors, unexpected, consoleOutput });
        await page.context().close();
        throw cause;
      }
      return {
        page, requests, releaseResource,
        setAccount: (value) => { account = value; },
        finish: async () => {
          const panel = page.getByRole('region', { name: 'Read-only Web3 result' });
          if (await panel.count()) {
            await expect(panel.getByText(restrictionNotice, { exact: true })).toBeVisible();
            await expect(panel.getByText(scopeNotice, { exact: true })).toBeVisible();
          }
          assert.deepEqual(unexpected, [], 'No unexpected or external requests');
          assert.deepEqual(errors, [], 'No browser runtime errors');
          assert.doesNotMatch(await page.content(), secretIdentifiers, 'No server-secret identifiers in browser HTML');
          assert.doesNotMatch(consoleOutput.join('\n'), secretIdentifiers, 'No server-secret identifiers in browser console');
          assert.ok(requests.every((request) => request.method === 'GET'), 'Read-only transport');
          await page.close();
        },
      };
    };

    // Fail at bootstrap instead of repeating every behavior check against a broken bundle.
    const bootstrap = await visit();
    await bootstrap.finish();

    await t.test('public roadmap neither reads nor renders the preview', async () => {
      const view = await visit();
      await view.page.waitForTimeout(100);
      await expect(view.page.getByRole('heading', { name: 'Read-only Web3 preview' })).toHaveCount(0);
      assert.deepEqual(view.requests, []);
      await view.finish();
    });

    await t.test('authenticated direct customer visit reads synthetic data and clears on logout', async () => {
      const view = await visit({ authenticated: true });
      await expect(view.page.getByText(sourceLabels.synthetic, { exact: true })).toBeVisible();
      assert.ok(view.requests.some((request) => request.path === '/api/auth/session'));
      assert.ok(view.requests.some((request) => request.path === '/api/web3/token' && request.authorization === 'Bearer synthetic-session'));
      await expect(view.page.getByText(/not an official RHC token/i)).toBeVisible();
      await expect(view.page.getByText(restrictionNotice, { exact: true })).toBeVisible();
      await expect(view.page.getByText(scopeNotice, { exact: true })).toBeVisible();
      await expect(view.page.getByRole('button')).toHaveCount(0);
      await expect(view.page.getByRole('link')).toHaveCount(0);
      await view.page.evaluate(() => window.web3Harness.logout());
      await expect(view.page.getByRole('heading', { name: 'Read-only Web3 preview' })).toHaveCount(0);
      await view.finish();
    });

    for (const options of [{ adminAccount: true }, { account: { account_status: 'DISABLED' } }]) {
      await t.test(`customer preview excludes ${options.adminAccount ? 'staff' : 'inactive accounts'}`, async () => {
        const view = await visit({ authenticated: true, ...options });
        await expect.poll(() => view.requests.length).toBe(1);
        await view.page.waitForTimeout(100);
        await expect(view.page.getByRole('heading', { name: 'Read-only Web3 preview' })).toHaveCount(0);
        assert.ok(!view.requests.some((request) => request.path === '/api/web3/token'));
        await view.finish();
      });
    }

    await t.test('permission denial never mounts the admin reader', async () => {
      const view = await visit({ authenticated: true, admin: true, permission: false });
      await view.page.waitForTimeout(100);
      assert.ok(!view.requests.some((request) => request.path === '/api/admin/integrations/thirdweb'));
      await expect(view.page.getByRole('heading', { name: 'Thirdweb read-only integration' })).toHaveCount(0);
      await view.finish();
    });

    for (const scope of [{ company_ids: ['company-a'] }, { project_ids: ['project-a'] }, { company_ids: undefined }, { project_ids: undefined }]) {
      await t.test(`admin scopes fail closed: ${JSON.stringify(scope)}`, async () => {
        const view = await visit({ authenticated: true, admin: true, account: scope });
        await expect(view.page.getByText(/Global integration.view access is required/)).toBeVisible();
        assert.ok(!view.requests.some((request) => request.path === '/api/admin/integrations/thirdweb'));
        await view.finish();
      });
    }

    await t.test('mixed global and scoped grants retain authorized server-wide integration access', async () => {
      const view = await visit({ authenticated: true, admin: true,
        account: { company_ids: ['company-a'], project_ids: ['project-a'] },
        grants: [{ company_id: 'company-a', project_id: 'project-a' }, { company_id: null, project_id: null }],
      });
      await expect(view.page.getByText(sourceLabels.synthetic, { exact: true })).toBeVisible();
      assert.ok(view.requests.some(request => request.path === '/api/admin/capabilities' && request.authorization === 'Bearer synthetic-session'));
      assert.ok(view.requests.some(request => request.path === '/api/admin/integrations/thirdweb' && request.authorization === 'Bearer synthetic-session'));
      await view.finish();
    });

    await t.test('admin read errors support Tab/Enter retry without inferring health', async () => {
      const view = await visit({ authenticated: true, admin: true, failOnce: true });
      await expect(view.page.getByRole('alert')).toContainText('Synthetic read failure');
      await expect(view.page.getByText(sourceLabels.synthetic, { exact: true })).toHaveCount(0);
      const retry = view.page.getByRole('button', { name: 'Retry', exact: true });
      await view.page.keyboard.press('Tab');
      await expect(retry).toBeFocused();
      assert.equal(await retry.evaluate((element) => element.matches(':focus-visible')), true);
      await view.page.keyboard.press('Enter');
      await expect(view.page.getByText(sourceLabels.synthetic, { exact: true })).toBeVisible();
      assert.equal(view.requests.filter((request) => request.path === '/api/admin/integrations/thirdweb').length, 2);
      await view.finish();
    });

    for (const admin of [false, true]) {
      await t.test(`${admin ? 'admin' : 'customer'} reader announces loading until its intercepted resource is released`, async () => {
        const view = await visit({ authenticated: true, admin, delayResource: true });
        try {
          const resourcePath = admin ? '/api/admin/integrations/thirdweb' : '/api/web3/token';
          await expect.poll(() => view.requests.some((request) => request.path === resourcePath)).toBe(true);
          await expect(view.page.getByRole('status')).toHaveText('Loading records…');
          await expect(view.page.getByRole('region', { name: 'Read-only Web3 result' })).toHaveCount(0);
          await expect(view.page.getByRole('alert')).toHaveCount(0);
        } finally {
          view.releaseResource();
        }
        await expect(view.page.getByText(sourceLabels.synthetic, { exact: true })).toBeVisible();
        await expect(view.page.getByText('Loading records…', { exact: true })).toHaveCount(0);
        await view.finish();
      });
    }

    await t.test('explorer is keyboard reachable and activation is prevented without navigation', async () => {
      const view = await visit({ authenticated: true, result: explorerFixture });
      const link = view.page.getByRole('link', { name: 'Open testnet explorer (opens in a new tab)', exact: true });
      await expect(link).toBeVisible();
      await view.page.keyboard.press('Tab');
      await expect(link).toBeFocused();
      const focus = await link.evaluate((element) => {
        const style = getComputedStyle(element);
        return { visible: element.matches(':focus-visible'), style: style.outlineStyle, width: parseFloat(style.outlineWidth) };
      });
      assert.equal(focus.visible, true);
      assert.notEqual(focus.style, 'none');
      assert.ok(focus.width > 0, 'Keyboard focus has a visible outline');
      await link.evaluate((element) => element.addEventListener('click', (event) => {
        event.preventDefault();
        element.setAttribute('data-keyboard-activation', 'prevented');
      }, { once: true }));
      const before = view.page.url();
      await view.page.keyboard.press('Enter');
      await expect(link).toHaveAttribute('data-keyboard-activation', 'prevented');
      assert.equal(view.page.url(), before);
      assert.equal(view.page.context().pages().length, 1, 'No explorer tab opened');
      await view.finish();
    });

    await t.test('untrusted token metadata renders as inert text, never markup or executable code', async () => {
      const name = '<img src="https://metadata.example.test/pixel" onerror="window.web3Injected=true">';
      const symbol = '<svg onload="window.web3Injected=true"></svg>';
      const diagnosticCode = '<script>window.web3Injected=true</script>';
      const view = await visit({ authenticated: true, result: {
        ...synthetic, diagnosticCode,
        data: { ...synthetic.data, name: { status: 'observed', value: name }, symbol: { status: 'observed', value: symbol } },
      } });
      const panel = view.page.getByRole('region', { name: 'Read-only Web3 result' });
      const nameField = panel.getByText('Token name', { exact: true }).locator('..').locator('dd');
      const symbolField = panel.getByText('Token symbol', { exact: true }).locator('..').locator('dd');
      await expect(nameField).toBeVisible();
      await expect(nameField).toContainText(name);
      await expect(symbolField).toBeVisible();
      await expect(symbolField).toContainText(symbol);
      await expect(panel.getByText(diagnosticCode, { exact: true })).toBeVisible();
      await expect(panel.locator('img, svg, script, iframe, [onerror], [onload]')).toHaveCount(0);
      assert.equal(await view.page.evaluate(() => window.web3Injected), undefined);
      await view.finish();
    });

    for (const admin of [false, true]) {
      for (const theme of ['dark', 'light']) {
        await t.test(`${admin ? 'admin' : 'customer'} ${theme} preview lays out with compiled app CSS at 390px and 768px`, async () => {
          const longNumber = '1234567890'.repeat(12);
          const result = {
            ...explorerFixture,
            diagnosticCode: 'SYNTHETIC_LONG_METADATA_' + 'x'.repeat(100),
            data: { ...synthetic.data, totalSupply: { status: 'observed', value: { raw: longNumber, formatted: longNumber } } },
            block: { number: longNumber, hash: '0x' + 'b'.repeat(64), timestamp: synthetic.observedAt, finality: 'observed' },
          };
          const view = await visit({ authenticated: true, admin, result, theme, viewport: { width: 390, height: 844 } });
          await expect(view.page.getByText(sourceLabels.thirdweb_testnet, { exact: true })).toBeVisible();
          for (const width of [390, 768]) {
            await view.page.setViewportSize({ width, height: 1024 });
            const layout = await view.page.getByRole('region', { name: 'Read-only Web3 result' }).evaluate((panel) => {
              const grid = panel.querySelector('dl');
              const gridStyle = getComputedStyle(grid);
              const card = panel.closest('.rhc-card');
              const fields = [...panel.querySelectorAll('dd')];
              return {
                viewport: window.innerWidth,
                documentWidth: document.documentElement.scrollWidth,
                bodyFontSize: getComputedStyle(document.body).fontSize,
                surface: getComputedStyle(document.documentElement).getPropertyValue('--rhc-surface').trim(),
                cardBackground: getComputedStyle(card).backgroundColor,
                cardPadding: parseFloat(getComputedStyle(card).paddingLeft),
                display: gridStyle.display,
                columns: gridStyle.gridTemplateColumns.split(/\s+/).length,
                gap: parseFloat(gridStyle.columnGap),
                overflowingFields: fields.filter((field) => {
                  const box = field.getBoundingClientRect();
                  return field.scrollWidth > field.clientWidth + 1 || box.left < 0 || box.right > window.innerWidth + 1;
                }).map((field) => field.previousElementSibling.textContent),
              };
            });
            assert.equal(layout.viewport, width);
            assert.equal(layout.bodyFontSize, '15px', 'Existing app typography is applied');
            assert.ok(layout.surface, 'Shared design tokens are loaded');
            assert.notEqual(layout.cardBackground, 'rgba(0, 0, 0, 0)', 'Real card surface is styled');
            assert.ok(layout.cardPadding > 0, 'Existing card spacing is applied');
            assert.equal(layout.display, 'grid', 'Compiled Tailwind utility is applied');
            assert.equal(layout.columns, width < 640 ? 1 : 2, 'Responsive metadata columns follow the existing breakpoint');
            assert.ok(layout.gap > 0);
            assert.ok(layout.documentWidth <= width + 1, 'No horizontal document overflow');
            assert.deepEqual(layout.overflowingFields, [], 'Long field values remain inside their cards');
          }
          await view.finish();
        });
      }
    }

    await t.test('partial fields preserve exact supply and never invent cap or paused values', async () => {
      const view = await visit({ authenticated: true });
      await expect(view.page.getByText('Token field observations', { exact: true })).toBeVisible();
      await expect(view.page.getByText('Total supply', { exact: true }).locator('..')).toContainText('1000000000000000000000000');
      await expect(view.page.getByText('Cap', { exact: true }).locator('..')).toContainText('unsupported');
      await expect(view.page.getByText('Paused flag', { exact: true }).locator('..')).toContainText('unavailable');
      await expect(view.page.getByRole('status')).toContainText('Partial snapshot');
      await expect(view.page.getByText('Last successful read', { exact: true }).locator('..')).toContainText('No successful read recorded');
      await expect(view.page.getByText('Total supply is a contract-wide observation, not circulating supply or a market valuation.', { exact: true })).toBeVisible();
      await view.finish();
    });

    for (const state of [
      { source: 'disabled', connection: 'disabled', configuration: 'disabled', diagnosticCode: null },
      { source: 'thirdweb_testnet', connection: 'disabled', configuration: 'disabled', diagnosticCode: null },
      { source: 'thirdweb_testnet', connection: 'not_configured', configuration: 'invalid', diagnosticCode: 'WEB3_CONFIG_INVALID' },
      { source: 'thirdweb_testnet', connection: 'unavailable', configuration: 'valid', diagnosticCode: 'READ_UNAVAILABLE' },
    ]) {
      await t.test(`absent ${state.source}/${state.connection} outcome is not healthy from configuration`, async () => {
        const result = { ...synthetic, ...state, snapshot: 'absent', data: null, observedAt: null, lastAttemptAt: null };
        const view = await visit({ authenticated: true, admin: true, result });
        await expect(view.page.getByRole('status')).toContainText('No snapshot is available');
        await expect(view.page.getByText('Connection', { exact: true }).locator('..')).toContainText(state.connection);
        await expect(view.page.getByText('Configuration', { exact: true }).locator('..')).toContainText(state.configuration);
        await expect(view.page.getByText('Diagnostic code', { exact: true }).locator('..')).toContainText(state.diagnosticCode ?? 'None reported');
        await expect(view.page.getByText('Token field observations', { exact: true })).toHaveCount(0);
        await expect(view.page.getByText('Synthetic Demo Token', { exact: true })).toHaveCount(0);
        await expect(view.page.getByText(sourceLabels[state.source], { exact: true })).toBeVisible();
        if (state.configuration === 'disabled') await expect(view.page.getByText(sourceLabels.disabled, { exact: true })).toBeVisible();
        await view.finish();
      });
    }

    for (const [snapshot, diagnosticCode] of [['fresh', null], ['stale', 'READ_TIMEOUT'], ['stale', 'REFRESH_REQUIRED']]) {
      await t.test(`testnet ${snapshot}/${diagnosticCode} observation shows timestamps, false/zero, and observed-only finality`, async () => {
        const result = {
          ...synthetic, source: 'thirdweb_testnet', connection: snapshot === 'fresh' ? 'ready' : 'degraded', snapshot,
          diagnosticCode,
          lastSuccessAt: synthetic.observedAt, lastAttemptAt: '2026-09-22T10:00:00.000Z',
          chain: { id: 11155111, name: 'Sepolia' },
          contractAddress: '0x0000000000000000000000000000000000000001',
          explorerUrl: 'https://sepolia.etherscan.io/address/0x0000000000000000000000000000000000000001',
          block: { number: '9007199254740993', hash: '0x' + 'a'.repeat(64), timestamp: synthetic.observedAt, finality: 'observed' },
          data: {
            ...synthetic.data,
            decimals: { status: 'observed', value: 0 },
            cap: { status: 'observed', value: { raw: '900719925474099312345678901234567890', formatted: null } },
            paused: { status: 'observed', value: false },
          },
        };
        const view = await visit({ authenticated: true, admin: true, result });
        await expect(view.page.getByText(sourceLabels.thirdweb_testnet, { exact: true })).toBeVisible();
        await expect(view.page.getByText('Paused flag', { exact: true }).locator('..')).toContainText('false');
        await expect(view.page.getByText('Decimals', { exact: true }).locator('..')).toContainText('0');
        await expect(view.page.getByText('Cap', { exact: true }).locator('..')).toContainText(result.data.cap.value.raw);
        await expect(view.page.getByText('Cap', { exact: true }).locator('..')).toContainText('Formatted: Not available');
        await expect(view.page.getByText('Block number', { exact: true }).locator('..')).toContainText('9007199254740993');
        await expect(view.page.getByText('Block finality', { exact: true }).locator('..')).toContainText('observed — no finality guarantee');
        await expect(view.page.getByText('Last successful read', { exact: true }).locator('..')).toContainText(synthetic.observedAt);
        await expect(view.page.getByText('Last attempted read', { exact: true }).locator('..')).toContainText(result.lastAttemptAt);
        if (snapshot === 'stale') {
          await expect(view.page.getByRole('status')).toContainText('Stale snapshot');
          await expect(view.page.getByRole('status')).toContainText(diagnosticCode === 'REFRESH_REQUIRED'
            ? 'Refresh is required to obtain a current observation.'
            : 'The provider cannot currently refresh this snapshot.');
          if (diagnosticCode === 'REFRESH_REQUIRED') await expect(view.page.getByRole('status')).not.toContainText('provider cannot');
        }
        const explorer = view.page.getByRole('link', { name: 'Open testnet explorer (opens in a new tab)', exact: true });
        await expect(explorer).toHaveAttribute('href', result.explorerUrl);
        await expect(explorer).toHaveAttribute('target', '_blank');
        await expect(explorer).toHaveAttribute('rel', 'noopener noreferrer');
        await expect(explorer).toHaveAttribute('referrerpolicy', 'no-referrer');
        await expect(view.page.getByRole('link')).toHaveCount(1);
        await expect(view.page.getByRole('button')).toHaveCount(0);
        await view.finish();
      });
    }

    for (const [source, explorerUrl] of [
      ['synthetic', 'https://sepolia.etherscan.io/address/fixture'],
      ['disabled', 'https://sepolia.etherscan.io/address/fixture'],
      ['thirdweb_testnet', null],
      ['thirdweb_testnet', 'not a URL'],
      ['thirdweb_testnet', '//sepolia.etherscan.io/address/fixture'],
      ['thirdweb_testnet', 'http://sepolia.etherscan.io/address/fixture'],
      ['thirdweb_testnet', 'javascript:alert(1)'],
      ['thirdweb_testnet', 'data:text/html,fixture'],
      ['thirdweb_testnet', 'https://user:password@sepolia.etherscan.io/address/fixture'],
      ['thirdweb_testnet', 'https://user@sepolia.etherscan.io/address/fixture'],
      ['thirdweb_testnet', 'https://:password@sepolia.etherscan.io/address/fixture'],
    ]) {
      await t.test(`explorer is not linked for ${source}: ${explorerUrl}`, async () => {
        const view = await visit({ authenticated: true, result: { ...synthetic, source, explorerUrl } });
        await expect(view.page.getByText(sourceLabels[source], { exact: true })).toBeVisible();
        await expect(view.page.getByText('Explorer reference', { exact: true }).locator('..')).toContainText('Not available');
        await expect(view.page.getByRole('link')).toHaveCount(0);
        await view.finish();
      });
    }

    await t.test('explorer origin comes from the server result, not a client chain allowlist', async () => {
      const explorerUrl = 'https://server-approved-explorer.example.test/contract/fixture';
      const view = await visit({ authenticated: true, result: { ...synthetic, source: 'thirdweb_testnet', explorerUrl } });
      await expect(view.page.getByRole('link', { name: 'Open testnet explorer (opens in a new tab)', exact: true })).toHaveAttribute('href', explorerUrl);
      await view.finish();
    });

    await t.test('server denial remains an error, never a fixture fallback', async () => {
      const view = await visit({ authenticated: true, admin: true, status: 403 });
      await expect(view.page.getByRole('alert')).toContainText('Global read access denied by server');
      await expect(view.page.getByRole('region', { name: 'Read-only Web3 result' })).toHaveCount(0);
      await view.finish();
    });

    await t.test('changing session removes previously visible customer data', async () => {
      const view = await visit({ authenticated: true });
      await expect(view.page.getByText(sourceLabels.synthetic, { exact: true })).toBeVisible();
      view.setAccount({ id: 'replacement-staff', email: 'staff@example.test', account_status: 'ACTIVE', role: 'SYSTEM_ADMIN' });
      await view.page.evaluate(() => window.web3Harness.switchSession());
      await expect(view.page.getByRole('heading', { name: 'Read-only Web3 preview' })).toHaveCount(0);
      await view.finish();
    });
  } finally {
    await browser.close();
  }
});
