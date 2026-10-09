'use strict';
const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const ROOT='C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-wallet-w2a-20261009';
const W1='C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-frontend-web3';
const EVIDENCE='C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-wallet-w2a-20261009-evidence/w2a-20261009';
require(path.join(ROOT,'apps/customer-web/tests/offline-network.cjs'));
const esbuild=require(require.resolve('esbuild',{paths:[W1]}));
const {chromium}=require(require.resolve('playwright',{paths:[W1]}));
let browser, metafile;
before(async()=>{
  const build=await esbuild.build({
    entryPoints:[path.join(EVIDENCE,'browser-entry.tsx')],
    outfile:path.join(EVIDENCE,'browser.bundle.js'),
    bundle:true,format:'iife',platform:'browser',jsx:'automatic',metafile:true,
    nodePaths:[path.join(W1,'node_modules')],
    alias:{'@rhc/ui':path.join(EVIDENCE,'ui-stub.ts')},
    logLevel:'silent',write:true,sourcemap:false,minify:false,legalComments:'none',
  });
  metafile=build.metafile;
  const imported=Object.keys(metafile.inputs).map(s=>s.replaceAll('\\','/'));
  assert.equal(imported.some(s=>/(?:^|\/)thirdweb(?:\/|$)/i.test(s)),false,
    'W2A mounted panel must not import thirdweb SDK modules');
  const linked=Object.values(metafile.outputs).flatMap(o=>o.imports.filter(x=>x.external));
  assert.deepEqual(linked,[],'No external runtime import in W2A browser bundle');
  const contents=fs.readFileSync(path.join(EVIDENCE,'browser.bundle.js'),'utf8');
  for(const term of ['THIRDWEB_SECRET_KEY','SUPABASE_SERVICE_ROLE_KEY','signMessage(','sendTransaction('])
    assert.equal(contents.includes(term),false,'Unsafe runtime identifier '+term);
  browser=await chromium.launch({headless:true,args:['--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1, EXCLUDE localhost']});
});
after(async()=>{if(browser)await browser.close()});

async function fixture(options={}){
  const ctx=await browser.newContext({
    viewport:options.viewport??{width:1200,height:800},
    reducedMotion:'reduce',serviceWorkers:'block',offline:true,
  });
  const bad=[],errors=[];
  await ctx.route('**/*',route=>{
    const url=route.request().url();
    if(url.startsWith(pathToFileURL(EVIDENCE+'/').href))return route.continue();
    bad.push(url);return route.abort('blockedbyclient');
  });
  await ctx.addInitScript(current=>{window.__W2A_TEST_CURRENT=current},options.current!==false);
  const page=await ctx.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(pathToFileURL(path.join(EVIDENCE,'browser.html')).href);
  await page.locator('[data-w2a-state="disabled"]').waitFor();
  return{page,ctx,bad,errors};
}

test('W2A-UI-01 authenticated synthetic account remains disabled and never loads SDK',async()=>{
 const{page,ctx,bad,errors}=await fixture();
 try{
  assert.equal(await page.locator('[data-provider-loaded="false"]').count(),1);
  assert.match(await page.getByRole('status').innerText(),/Wallet onboarding is disabled/);
  assert.equal(await page.getByRole('button',{name:'Connect embedded wallet (unavailable)',exact:true}).isDisabled(),true);
  assert.equal(await page.getByRole('button',{name:'Connect external wallet (unavailable)',exact:true}).isDisabled(),true);
  assert.deepEqual(bad,[]);assert.deepEqual(errors,[]);
 }finally{await ctx.close()}
});

test('W2A-UI-02 logout/absent session displays identity prerequisite, no network',async()=>{
 const{page,ctx,bad,errors}=await fixture({current:false});
 try{
  assert.match(await page.locator('li').allInnerTexts().then(v=>v.join(' ')),/authenticated RHC customer session/i);
  assert.equal(await page.locator('[data-w2a-state]').getAttribute('data-w2a-state'),'disabled');
  assert.deepEqual(bad,[]);assert.deepEqual(errors,[]);
 }finally{await ctx.close()}
});

test('W2A-UI-03 network and authorization prerequisites remain visible',async()=>{
 const{page,ctx,bad,errors}=await fixture();
 try{
  const all=(await page.locator('li').allInnerTexts()).join(' ');
  assert.match(all,/No blockchain network has been approved/);
  assert.match(all,/Thirdweb account\/service readiness/);
  assert.match(all,/authentication trust and recovery/);
  assert.match(all,/Backend wallet ownership and linking/);
  assert.deepEqual(bad,[]);assert.deepEqual(errors,[]);
 }finally{await ctx.close()}
});

test('W2A-UI-04 keyboard activation cannot enable disabled wallet buttons',async()=>{
 const{page,ctx,bad,errors}=await fixture();
 try{
  const embedded=page.getByRole('button',{name:'Connect embedded wallet (unavailable)',exact:true});
  await embedded.focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Space');
  assert.equal(await embedded.isDisabled(),true);
  assert.equal(await page.locator('[data-provider-loaded="true"]').count(),0);
  assert.deepEqual(bad,[]);assert.deepEqual(errors,[]);
 }finally{await ctx.close()}
});

test('W2A-UI-05 375px mobile viewport has no horizontal overflow or clipped buttons',async()=>{
 const{page,ctx,bad,errors}=await fixture({viewport:{width:375,height:740}});
 try{
  const actual=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
  assert.ok(actual.scroll<=actual.width,JSON.stringify(actual));
  assert.equal(await page.getByRole('heading',{name:'Thirdweb wallet'}).isVisible(),true);
  assert.equal(await page.getByRole('button',{name:'Connect embedded wallet (unavailable)',exact:true}).isVisible(),true);
  assert.deepEqual(bad,[]);assert.deepEqual(errors,[]);
 }finally{await ctx.close()}
});

test('W2A-UI-06 reduced motion and status semantics remain available',async()=>{
 const{page,ctx,bad,errors}=await fixture();
 try{
  assert.equal(await page.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches),true);
  assert.equal(await page.getByRole('status').getAttribute('aria-live'),'polite');
  assert.equal(await page.getByRole('region',{name:'Thirdweb wallet integration readiness'}).count(),1);
  assert.deepEqual(bad,[]);assert.deepEqual(errors,[]);
 }finally{await ctx.close()}
});

test('W2A-UI-07 reload never restores a wallet or session-specific provider state',async()=>{
 const{page,ctx,bad,errors}=await fixture();
 try{
  await page.reload();
  await page.locator('[data-w2a-state="disabled"]').waitFor();
  assert.equal(await page.locator('[data-provider-loaded="true"]').count(),0);
  assert.equal(await page.getByText('Live Thirdweb is not enabled.',{exact:false}).count(),1);
  assert.deepEqual(bad,[]);assert.deepEqual(errors,[]);
 }finally{await ctx.close()}
});
