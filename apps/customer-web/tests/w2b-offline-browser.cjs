'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const ROOT = 'C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-w2b-offline-20261009';
const W1 = 'C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-frontend-web3';
const EVIDENCE = 'C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-wallet-w2a-20261009-evidence/w2b-p1-implementation-20261009';
require(path.join(ROOT, 'apps/customer-web/tests/offline-network.cjs'));
const esbuild = require(require.resolve('esbuild', { paths: [W1] }));
const { chromium } = require(require.resolve('playwright', { paths: [W1] }));
let browser;

before(async () => {
  const result = await esbuild.build({
    entryPoints: [path.join(EVIDENCE, 'browser-entry.tsx')],
    outfile: path.join(EVIDENCE, 'browser.bundle.js'),
    bundle: true, format: 'iife', platform: 'browser', jsx: 'automatic',
    nodePaths: [path.join(W1, 'node_modules')],
    write: true, metafile: true, sourcemap: false,
    minify: false, logLevel: 'silent', legalComments: 'none',
  });
  const included = Object.keys(result.metafile.inputs).map(x => x.replaceAll('\\','/'));
  assert.equal(included.some(x => /(?:^|\/)thirdweb(?:\/|$)/i.test(x)), false,
    'No Thirdweb runtime SDK may be bundled into synthetic laboratory');
  const external = Object.values(result.metafile.outputs).flatMap(v => v.imports.filter(i => i.external));
  assert.deepEqual(external, []);
  const code = fs.readFileSync(path.join(EVIDENCE,'browser.bundle.js'),'utf8');
  for(const needle of ['createThirdwebClient','THIRDWEB_SECRET_KEY','SUPABASE_SERVICE_ROLE_KEY','sendTransaction(','signMessage('])
    assert.equal(code.includes(needle),false,'Forbidden runtime identifier '+needle);
  browser = await chromium.launch({ headless: true,
    args: ['--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1, EXCLUDE localhost'],
  });
});
after(async () => { if (browser) await browser.close(); });

async function fixture(width=1200, height=800) {
  const ctx = await browser.newContext({
    viewport: { width, height }, reducedMotion: 'reduce',
    serviceWorkers:'block', offline:true,
  });
  const blocked = [], pageErrors = [];
  await ctx.route('**/*', route => {
    const url = route.request().url();
    if (url.startsWith(pathToFileURL(EVIDENCE + '/').href)) return route.continue();
    blocked.push(url);
    return route.abort('blockedbyclient');
  });
  const page=await ctx.newPage();
  page.on('pageerror',e=>pageErrors.push(e.message));
  await page.goto(pathToFileURL(path.join(EVIDENCE,'browser.html')).href);
  await page.locator('[data-w2b-mode="synthetic-only"]').waitFor();
  return {page,ctx,blocked,pageErrors};
}
const connect = p=>p.getByRole('button',{name:'Connect mock fixture',exact:true});
const cancel = p=>p.getByRole('button',{name:'Cancel mock connection',exact:true});
const disconnect = p=>p.getByRole('button',{name:'Disconnect mock fixture',exact:true});
async function waitStatus(page,expect){
  await page.waitForFunction(
    s => document.querySelector('[data-w2b-mode]')?.getAttribute('data-w2b-status') === s,
    expect, {timeout:5000},
  );
}

test('OFF-37 keyboard Enter connects and disconnects only a synthetic fixture; focus follows',async()=>{
  const{page,ctx,blocked,pageErrors}=await fixture();
  try{
    const btn=connect(page);
    await btn.focus();
    assert.equal(await btn.evaluate(e=>e===document.activeElement),true);
    await page.keyboard.press('Enter');
    await waitStatus(page,'connected');
    await page.waitForFunction(() => document.activeElement?.textContent?.trim()==='Disconnect mock fixture');
    await page.keyboard.press('Space');
    await waitStatus(page,'disconnected');
    await page.waitForFunction(() => document.activeElement?.textContent?.trim()==='Connect mock fixture');
    assert.equal(await page.getByTestId('w2b-address').innerText(),'Not connected');
    assert.deepEqual(blocked,[]);
    assert.deepEqual(pageErrors,[]);
  }finally{await ctx.close();}
});

test('OFF-38 status/alert semantics announce a simulated failure without false success',async()=>{
  const{page,ctx,blocked,pageErrors}=await fixture();
  try{
    await page.getByRole('button',{name:'Fail next synthetic connection'}).click();
    await connect(page).click();
    await waitStatus(page,'failed');
    const status=page.getByRole('status');
    assert.equal(await status.getAttribute('aria-live'),'polite');
    const alert=page.getByRole('alert');
    assert.match(await alert.innerText(),/synthetic adapter refused/i);
    assert.equal(await page.getByTestId('w2b-address').innerText(),'Not connected');
    assert.match(await page.getByTestId('w2b-link').innerText(),/unknown.*never verified/);
    assert.deepEqual(blocked,[]);
    assert.deepEqual(pageErrors,[]);
  }finally{await ctx.close();}
});

test('OFF-39 responsive layouts 375, 768, 1440 prevent overflow and keep context accessible',async()=>{
  for(const size of [375,768,1440]){
    const {page,ctx,blocked,pageErrors}=await fixture(size,760);
    try{
      const widths=await page.evaluate(()=>({actual:innerWidth,scroll:document.documentElement.scrollWidth,body:document.body.scrollWidth}));
      assert.ok(widths.scroll<=widths.actual,JSON.stringify(widths));
      assert.ok(widths.body<=widths.actual,JSON.stringify(widths));
      assert.equal(await page.getByRole('heading',{name:'Synthetic wallet lifecycle lab'}).isVisible(),true);
      assert.equal(await connect(page).isVisible(),true);
      assert.deepEqual(blocked,[]);
      assert.deepEqual(pageErrors,[]);
    }finally{await ctx.close();}
  }
});

test('OFF-40 reduced-motion setting remains respected; no animation required',async()=>{
  const{page,ctx,blocked,pageErrors}=await fixture();
  try{
    assert.equal(await page.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches),true);
    assert.equal(await page.getByRole('region',{name:'RHC W2B-P1 synthetic wallet laboratory'}).count(),1);
    assert.equal(await page.locator('[data-w2b-mode]').getAttribute('data-w2b-mode'),'synthetic-only');
    assert.deepEqual(blocked,[]);
    assert.deepEqual(pageErrors,[]);
  }finally{await ctx.close();}
});

test('UI-05 customer A to B scope change clears address, independent of old cleanup',async()=>{
  const{page,ctx,blocked,pageErrors}=await fixture();
  try{
    await connect(page).click();
    await waitStatus(page,'connected');
    await page.getByRole('button',{name:'Switch synthetic RHC user'}).click();
    await waitStatus(page,'disconnected');
    assert.equal(await page.getByTestId('w2b-address').innerText(),'Not connected');
    assert.match(await page.getByTestId('w2b-link').innerText(),/^unknown/);
    await page.waitForFunction(() => window.__W2B_TRACE?.released?.length > 0);
    assert.deepEqual(blocked,[]);
    assert.deepEqual(pageErrors,[]);
  }finally{await ctx.close();}
});

test('UI-06 cancellation discards a late synthetic adapter result and cleans exact handle',async()=>{
  const{page,ctx,blocked,pageErrors}=await fixture();
  try{
    await connect(page).click();
    await waitStatus(page,'connecting');
    await cancel(page).click();
    await waitStatus(page,'disconnected');
    await page.waitForFunction(() => window.__W2B_TRACE?.released?.length >= 1);
    assert.equal(await page.getByTestId('w2b-address').innerText(),'Not connected');
    const released=await page.evaluate(()=>window.__W2B_TRACE.released.slice());
    assert.deepEqual(released,['fixture:ui-1']);
    assert.deepEqual(blocked,[]);
    assert.deepEqual(pageErrors,[]);
  }finally{await ctx.close();}
});

test('UI-07 logout, unapproved chain and consent withdrawal clear and disable the mock',async()=>{
  for(const action of ['Simulate synthetic logout','Simulate unapproved chain','Revoke mock consent']){
    const{page,ctx,blocked,pageErrors}=await fixture();
    try{
      await connect(page).click();
      await waitStatus(page,'connected');
      await page.getByRole('button',{name:action}).click();
      await waitStatus(page,'unavailable');
      assert.equal(await page.getByTestId('w2b-address').innerText(),'Not connected');
      assert.equal(await connect(page).isDisabled(),true);
      assert.deepEqual(blocked,[]);
      assert.deepEqual(pageErrors,[]);
    }finally{await ctx.close();}
  }
});

test('UI-08 reload loses synthetic wallet; browser bundle never persists a real wallet',async()=>{
  const{page,ctx,blocked,pageErrors}=await fixture();
  try{
    await connect(page).click();await waitStatus(page,'connected');
    await page.reload();await waitStatus(page,'disconnected');
    assert.equal(await page.getByTestId('w2b-address').innerText(),'Not connected');
    assert.match(await page.getByRole('status').innerText(),/Mock wallet disconnected/);
    const keys=await page.evaluate(()=>{
      try{
        return [...Object.keys(localStorage),...Object.keys(sessionStorage)]
          .filter(k=>/wallet|thirdweb|fixture:ui-/i.test(k));
      }catch{return [];}
    });
    assert.deepEqual(keys,[]);
    assert.deepEqual(blocked,[]);
    assert.deepEqual(pageErrors,[]);
  }finally{await ctx.close();}
});
