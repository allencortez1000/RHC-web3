'use strict';
/** W01-P1 isolated browser behavior of the REAL unchanged Web3ReadPanel.
 * No account, provider, API, Thirdweb or HTTP server exists in this harness.
 */
const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {pathToFileURL}=require('node:url');
const ROOT='C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-w01-w02-readonly-20261010';
const W1='C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-frontend-web3';
const E='C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-wallet-w2a-20261009-evidence/w01-p1-offline-20261010T014521Z';
require(ROOT+'/apps/customer-web/tests/offline-network.cjs');
const esbuild=require(require.resolve('esbuild',{paths:[W1]}));
const {chromium}=require(require.resolve('playwright',{paths:[W1]}));
let browser,meta;
before(async()=>{
 const out=await esbuild.build({
   entryPoints:[path.join(E,'browser-entry.tsx')],
   outfile:path.join(E,'browser.bundle.js'),
   bundle:true,format:'iife',platform:'browser',jsx:'automatic',
   nodePaths:[path.join(W1,'node_modules')],
   legalComments:'none',metafile:true,minify:false,logLevel:'silent'
 });
 meta=out.metafile;
 const inputs=Object.keys(meta.inputs).map(x=>x.replaceAll('\\','/'));
 assert.ok(inputs.some(x=>x.includes('packages/ui/src/web3-read-panel.tsx')),
    'Must bundle REAL Web3ReadPanel, not a replacement fake');
 assert.equal(inputs.some(x=>/(?:^|\/)(?:thirdweb|@thirdweb-dev)(?:\/|$)/i.test(x)),false);
 assert.equal(Object.values(meta.outputs).flatMap(x=>x.imports).filter(x=>x.external).length,0);
 const code=fs.readFileSync(path.join(E,'browser.bundle.js'),'utf8');
 for(const forbidden of ['THIRDWEB_SECRET_KEY','SUPABASE_SERVICE_ROLE_KEY','RHC_WEB3_RPC_URL','createThirdwebClient','sendTransaction(','signMessage(']){
  assert.equal(code.includes(forbidden),false,'Forbidden browser bundle identifier '+forbidden);
 }
 browser=await chromium.launch({headless:true,args:['--host-resolver-rules=MAP * ~NOTFOUND']});
});
after(async()=>{if(browser)await browser.close()});
async function fixture(width=1440,height=800){
 const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce',
   serviceWorkers:'block',offline:true});
 const bad=[],errors=[],consoleOutput=[];
 await context.route('**/*',route=>{
  const url=route.request().url();
  if(url.startsWith(pathToFileURL(E+'/').href))return route.continue();
  bad.push(url);return route.abort('blockedbyclient');
 });
 const page=await context.newPage();
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',e=>consoleOutput.push(e.text()));
 await page.goto(pathToFileURL(path.join(E,'browser.html')).href);
 await page.waitForFunction(()=>typeof window.__W01_SET_MODE__==='function');
 const panel=page.getByRole('region',{name:'Read-only Web3 result'});
 return {
  page,context,panel,bad,errors,consoleOutput,
  async finish(){assert.deepEqual(bad,[]);assert.deepEqual(errors,[]);
   assert.doesNotMatch(consoleOutput.join('\n'),/THIRDWEB_SECRET_KEY|FAKE_PRIVATE_TEST_VALUE|SUPABASE_SERVICE_ROLE_KEY/);
   await context.close();}
 };
}
async function switchMode(page,mode){
 await page.evaluate(s=>window.__W01_SET_MODE__(s),mode);
 await page.waitForFunction(s=>document.querySelector('.fixture-shell')?.getAttribute('data-w01-mode')===s,mode);
}
test('OFF-16 elapsed return-tab freshness is NOT automatically reclassified (documented GAP)',async()=>{
 const f=await fixture();
 try{
  await switchMode(f.page,'return-tab');
  await f.panel.getByText(/TESTNET PREVIEW/).waitFor();
  // Timestamp 2020 deliberately expired; current component renders the API's
  // "fresh" last-response label and instructs manual reload, not recomputation.
  assert.match(await f.panel.innerText(),/fresh \(at last response\)/);
  assert.match(await f.panel.innerText(),/does not automatically recheck freshness/i);
  assert.ok(!(await f.panel.innerText()).includes('Stale snapshot'));
 }finally{await f.finish();}
});

test('OFF-17 customer preview mounts reader only after RHC session and ACTIVE non-admin',async()=>{
 const src=fs.readFileSync(ROOT+'/apps/customer-web/app/components/web3-preview.tsx','utf8');
 assert.match(src,/useResource<[^>]+>\('\/auth\/session'\)/);
 assert.match(src,/account_status !== 'ACTIVE'/);
 assert.match(src,/isAdminAccount\(account\.data\.user\)/);
 assert.match(src,/return hasSession \? <VerifiedCustomerPreview \/> : null/);
 // Actual JWT/Auth + 401/403 contract is future connected acceptance, not asserted here.
 const f=await fixture();
 try{
  await f.panel.getByText(/SYNTHETIC DEMO/).waitFor();
  assert.equal(f.bad.length,0);
 }finally{await f.finish()}
});

test('OFF-18 admin requires effective global integration.view grant at client and API',()=>{
 const frontend=fs.readFileSync(ROOT+'/apps/admin-web/app/integrations/thirdweb-read-panel.tsx','utf8');
 const server=fs.readFileSync(ROOT+'/apps/api/src/modules/web3/web3.controller.ts','utf8');
 assert.match(frontend,/globalScope\(\)/);
 assert.match(frontend,/hasEffectiveGrant\(/);
 assert.match(server,/@RequirePermission\('integration.view', \{ target: 'global' \}\)/);
 assert.match(server,/@UseGuards\(AuthGuard, PermissionGuard\)/);
 // An authenticated live API test is explicitly NOT claimed.
});

test('OFF-19 demo view reveals no role, customer ID or access escalation on UI mode change',async()=>{
 const f=await fixture();
 try{
  await switchMode(f.page,'testnet');
  const initial=await f.panel.innerText();
  await switchMode(f.page,'disabled');
  const after=await f.panel.innerText();
  assert.ok(initial.includes('TESTNET PREVIEW'));
  assert.ok(after.includes('Blockchain preview is not enabled'));
  assert.ok(!after.includes('TEST FIXTURE'));
  assert.equal(await f.panel.locator('button').count(),0);
 }finally{await f.finish()}
});

test('OFF-20 no purchase, mint, signing, wallet activation or transaction UI',async()=>{
 const f=await fixture();
 try{
  for(const mode of ['synthetic','testnet','stale','partial']){
   await switchMode(f.page,mode);
   assert.equal(await f.panel.locator('button').count(),0);
   assert.doesNotMatch((await f.panel.innerText()).toLowerCase(),/buy now|sign message|send transaction|mint token/);
   assert.match(await f.panel.innerText(),/does not offer token purchases/i);
  }
 }finally{await f.finish()}
});

test('OFF-21 browser bundle contains neither runtime Thirdweb nor server secrets',async()=>{
 assert.equal(Object.keys(meta.inputs).some(x=>/thirdweb/i.test(x)),false);
 const f=await fixture();
 try{
  assert.doesNotMatch(await f.page.content(),/THIRDWEB_SECRET_KEY|PRIVATE_KEY|SUPABASE_SERVICE_ROLE_KEY|secretKey:/);
 }finally{await f.finish()}
});

test('OFF-22 absent, disabled, zero, unavailable and unsupported render differently',async()=>{
 const f=await fixture();
 try{
  await switchMode(f.page,'disabled');
  assert.match(await f.panel.innerText(),/No Web3 read is enabled/);
  await switchMode(f.page,'not-configured');
  assert.match(await f.panel.innerText(),/not_configured/);
  await switchMode(f.page,'absent');
  assert.match(await f.panel.innerText(),/No snapshot is available/);
  assert.doesNotMatch(await f.panel.innerText(),/Formatted: 0/);
  await switchMode(f.page,'zero');
  assert.match(await f.panel.innerText(),/Formatted: 0/);
  assert.match(await f.panel.innerText(),/Paused flag[\s\S]*false/);
  await switchMode(f.page,'unsupported');
  assert.match(await f.panel.innerText(),/Not supported by this read interface/);
  assert.match(await f.panel.innerText(),/No observation available/);
 }finally{await f.finish()}
});

test('OFF-23 390/768/1440 fixture viewport, focus and reduced motion',async()=>{
 for(const width of [390,768,1440]){
  const f=await fixture(width);
  try{
   await switchMode(f.page,'long');
   const info=await f.page.evaluate(()=>({
    inner:innerWidth,scroll:document.documentElement.scrollWidth,
    reduced:matchMedia('(prefers-reduced-motion: reduce)').matches
   }));
   assert.ok(info.scroll<=info.inner,JSON.stringify(info));
   assert.equal(info.reduced,true);
   const link=f.page.getByRole('link',{name:/Open testnet explorer/});
   await link.focus();
   assert.equal(await link.evaluate(el=>el===document.activeElement),true);
   assert.equal(await link.getAttribute('target'),'_blank');
  }finally{await f.finish()}
 }
});

test('OFF-25 unsupported official identity still plainly discloses not-official',async()=>{
 const f=await fixture();
 try{
  await switchMode(f.page,'testnet');
  assert.match(await f.panel.innerText(),/not an official RHC token/i);
  assert.match(await f.panel.innerText(),/testnet observations only/i);
  assert.equal(await f.panel.getByRole('link',{name:/Open testnet explorer/}).count(),1);
  await switchMode(f.page,'unsafe-http');
  assert.equal(await f.panel.getByRole('link').count(),0);
  await switchMode(f.page,'unsafe-userinfo');
  assert.equal(await f.panel.getByRole('link').count(),0);
 }finally{await f.finish()}
});

test('OFF-27 no RHC Points, token price or market conversion inferred',async()=>{
 const f=await fixture();
 try{
  await switchMode(f.page,'zero');
  assert.match(await f.panel.innerText(),/RHC Points remain a separate demo ledger/i);
  assert.match(await f.panel.innerText(),/Total supply is a contract-wide observation/i);
  assert.match(await f.panel.innerText(),/Market price is not established/i);
 }finally{await f.finish()}
});

test('OFF-XSS hostile token metadata is inert, no injected browser network',async()=>{
 const f=await fixture();
 try{
  await switchMode(f.page,'markup');
  assert.equal(await f.panel.locator('img,svg,iframe,script').count(),0);
  const t=await f.panel.innerText();
  assert.ok(t.includes('<img src='));
  assert.ok(t.includes('<svg onload='));
  assert.equal(await f.page.evaluate(()=>window.w01XSS),undefined);
 }finally{await f.finish()}
});
