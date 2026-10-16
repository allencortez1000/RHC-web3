/**
 * W03-11, task-owned actual Chromium browser QA for an UNMOUNTED synthetic view.
 * No application route, real wallet, API, SDK, RPC, transaction, third-party
 * asset, external stylesheet, data-storage write, or customer credential.
 *
 * Run with node --import tsx from the monorepo root.
 */
import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { chromium } from 'playwright';
import { PARTITION_FIXTURE, RECORD_FIXTURE } from
  '../app/components/wallet-thirdweb/w03-network-partition-offline/partition.ts';
import { OfflineNetworkPartitionPreview } from
  '../app/components/wallet-thirdweb/w03-network-partition-offline/OfflineNetworkPartitionPreview.tsx';

const expectedBase = '9ab9446c8820b1e40a2e9c8ac632d1a79b9aea39';
const outputArg = process.argv.find(v => v.startsWith('--output='));
assert.ok(outputArg, 'Task-owned external --output directory required');
const output = path.resolve(outputArg.slice('--output='.length));
assert.equal(fs.existsSync(output), true, 'Output directory must already exist');
assert.equal(output.includes('w03-11-browser-qa-20261016'), true, 'Use task-owned external evidence folder');
assert.equal(fs.statSync(output).isDirectory(), true);
const screenshots = path.join(output, 'screenshots');
assert.equal(fs.existsSync(screenshots), false, 'Do not overwrite existing screenshot evidence');
fs.mkdirSync(screenshots);

const scope = Object.freeze({
  fixtureKind: PARTITION_FIXTURE,
  rhcUserId: 'synthetic-user-viewer',
  sessionEpoch: 1,
  linkRevision: 'synthetic-link-rehearsal',
  sourceRevision: 'synthetic-source-browser',
});
const entry = patch => Object.freeze({
  fixtureKind: RECORD_FIXTURE,
  scope,
  layer: 'synthetic-l1',
  assetKey: 'synthetic-asset-invented',
  balanceState: 'unavailable',
  rawBaseUnits: null,
  decimals: null,
  movement: 'none',
  ...patch,
});
const SCENARIOS = Object.freeze({
  separate: [entry({ balanceState: 'observed', rawBaseUnits: '1000000000000000000', decimals: 18 }),
             entry({ layer: 'synthetic-l2-a', balanceState: 'observed', rawBaseUnits: '2500000000000000000', decimals: 18 })],
  unavailable: [entry({})],
  stale: [entry({ balanceState: 'stale' })],
  zero: [entry({ balanceState: 'observed', rawBaseUnits: '0', decimals: 18 })],
  inflight: [entry({ movement: 'synthetic_in_flight' })],
  otherAccount: [entry({ scope: {...scope, rhcUserId: 'synthetic-user-other'} })],
  otherRevision: [entry({ scope: {...scope, sourceRevision: 'synthetic-source-other'} })],
  duplicate: [entry({}), entry({ movement: 'synthetic_in_flight' })],
  forgedContract: [entry({ contractAddress: '0x' + '1'.repeat(40) })],
  hostileAsset: [entry({ assetKey: '<img src=x onerror=alert(1)>' })],
  forgedAction: [entry({ canBridge: true })],
});

const CSS = `
* {box-sizing:border-box}
:root {color-scheme:light; --rhc-primary:#03677c; --rhc-border:#bfd7de; --rhc-surface:#fff}
body {margin:0;min-height:100vh;background:#eef6fa;color:#1b3645;
  font:16px/1.55 system-ui,-apple-system,"Segoe UI",sans-serif}
main {width:100%;max-width:1170px;margin:0 auto;padding:18px}
h1 {font-size:clamp(21px,4.2vw,28px);line-height:1.25;margin:8px 0 18px}
[data-w03-network-partition] {width:100%;border-radius:22px;border:1px solid #bfd7de;
 background:#fff;box-shadow:0 10px 36px rgba(20,71,97,.07);padding:clamp(16px,3.6vw,26px)}
[data-w03-network-partition] h2 {font-size:clamp(20px,3.5vw,26px);line-height:1.27;margin:10px 0}
[data-w03-network-partition] h3 {font-size:16px;line-height:1.4;margin:0}
[data-w03-network-partition] p {margin:10px 0;overflow-wrap:anywhere}
[data-w03-network-notice] {padding:12px 14px;border-radius:10px;background:#e9f6f8;
 border:1px solid #a8d9df;color:#184558;font-weight:600}
[data-w03-network-rows] {display:grid;gap:15px;
 grid-template-columns:repeat(auto-fit,minmax(min(100%,275px),1fr));margin:14px 0}
[data-w03-network-rows] article {border:1px solid #d3e3e8;border-radius:14px;padding:16px;
 min-width:0;overflow-wrap:anywhere}
[data-w03-network-rows] article:nth-child(even){background:#f7fbfc}
[data-w03-network-unavailable]{background:#fff8ec;border-radius:12px;padding:14px}
[data-w03-no-aggregate] {font-weight:700}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{scroll-behavior:auto!important;transition:none!important}}
`;
const csp = "default-src 'none'; script-src 'none'; connect-src 'none'; img-src 'none'; frame-src 'none'; object-src 'none'; font-src 'none'; base-uri 'none'; form-action 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'";
const list = new Set(Object.keys(SCENARIOS));
const renders = [];
let port;
const requests = [];
function htmlFor(caseName) {
  const input = SCENARIOS[caseName];
  const oldFetch = globalThis.fetch;
  globalThis.fetch = () => { throw new Error('FORBIDDEN_RHC_NETWORK_FETCH'); };
  let body;
  try {
    body = renderToStaticMarkup(React.createElement(OfflineNetworkPartitionPreview, {scope,records:input}));
  } finally {globalThis.fetch=oldFetch}
  renders.push({case:caseName,bytes:Buffer.byteLength(body)});
  assert.ok(!/<script\b/i.test(body));
  return '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<meta name="robots" content="noindex,nofollow">' +
    '<title>RHC Synthetic Wallet Network QA — ' + caseName + '</title>' +
    '<style>' + CSS + '</style></head><body><main>' +
    '<h1>RHC Offline Wallet Display QA</h1>' +
    body + '</main></body></html>';
}
const server = http.createServer((req,res) => {
  requests.push({method:req.method,url:req.url,host:req.headers.host||''});
  if(req.method !== 'GET' || req.headers.host !== '127.0.0.1:'+port ||
     !req.url?.startsWith('/s/') || !list.has(req.url.slice(3))){
    res.writeHead(404, {'Cache-Control':'no-store', 'Content-Type':'text/plain; charset=utf-8'});
    return res.end('Not found');
  }
  const source = htmlFor(req.url.slice(3));
  res.writeHead(200, {
   'Content-Type':'text/html; charset=utf-8',
   'Cache-Control':'no-store,max-age=0',
   'Content-Security-Policy':csp,
   'X-Content-Type-Options':'nosniff',
   'Referrer-Policy':'no-referrer',
   'X-Robots-Tag':'noindex,nofollow',
  });
  res.end(source);
});

const checks=[];
const add = (name, passed, extra={})=>{ checks.push({name,passed,...extra});assert.ok(passed,name); };
let browser;
let failed=false, exception;
const errors=[];
const blockedExternal=[];
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');

try {
 await new Promise((resolve,reject)=>{
   server.once('error',reject);
   server.listen(0,'127.0.0.1',()=>{
    port=server.address().port;
    assert.ok(Number.isSafeInteger(port)&&port>0);
    resolve();
   });
 });
 const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
 assert.equal(fs.existsSync(chrome),true,'Expected authorized Chrome installation missing');
 browser=await chromium.launch({headless:true,executablePath:chrome,args:[
   '--disable-background-networking','--disable-component-update',
   '--disable-default-apps','--no-first-run']});
 async function open(scenario,width,height=900,opts={}) {
   const context=await browser.newContext({viewport:{width,height},
     deviceScaleFactor:1,hasTouch:width<=390,isMobile:width<=390,reducedMotion:'reduce'});
   const page=await context.newPage();
   page.on('pageerror',err=>errors.push({scenario,message:err.message}));
   page.on('console',msg=>{if(msg.type()==='error')errors.push({scenario,message:msg.text()});});
   await context.route('**/*', route=>{
     const req=route.request(), url=new URL(req.url());
     const safe=url.protocol==='http:'&&url.hostname==='127.0.0.1'&&url.port===String(port)&&
       req.method()==='GET'&&url.pathname==='/s/'+scenario;
     if(!safe){blockedExternal.push({scenario,method:req.method(),hostname:url.hostname,pathname:url.pathname});return route.abort();}
     return route.continue();
   });
   const response=await page.goto('http://127.0.0.1:'+port+'/s/'+scenario,
    {waitUntil:'domcontentloaded',timeout:25000});
   add('HTTP 200 '+scenario+' '+width,response.status()===200);
   add('CSP no scripts / no connections '+scenario+' '+width,
     response.headers()['content-security-policy']?.includes("script-src 'none'") &&
     response.headers()['content-security-policy']?.includes("connect-src 'none'"));
   add('Cache disabled '+scenario+' '+width,/no-store/.test(response.headers()['cache-control']||''));
   add('Named semantic region '+scenario+' '+width,
     await page.locator('[aria-labelledby="offline-network-heading"]').count()===1 &&
     await page.getByRole('heading',{level:1}).count()===1 &&
     await page.getByRole('heading',{level:2}).count()===1 &&
     await page.getByRole('status').count()===1);
   add('No focusable action or script '+scenario+' '+width,
     await page.locator('button,input,select,textarea,form,a,script,iframe').count()===0);
   const geometry=await page.evaluate(()=>({
     width:innerWidth,docWidth:document.documentElement.scrollWidth,
     shell:document.querySelector('[data-w03-network-partition]').getBoundingClientRect().toJSON()
   }));
   add('No horizontal viewport overflow '+scenario+' '+width,
     geometry.docWidth <= width+1 && geometry.shell.x>=-1 && geometry.shell.right<=width+1);
   if(opts.screenshot)await page.screenshot({path:path.join(screenshots,scenario+'-'+width+'.png'),fullPage:true});
   return {page,context,response,geometry};
 }
 for(const width of [320,375,768,1440]){
   const {page,context}=await open('separate',width,900,{screenshot:true});
   add('Separate two synthetic slots at width '+width,
     await page.locator('[data-network-layer]').count()===2 &&
     await page.locator('[data-network-layer="synthetic-l1"]').count()===1 &&
     await page.locator('[data-network-layer="synthetic-l2-a"]').count()===1);
   add('Layer-specific token formats width '+width,
     (await page.locator('[data-network-layer="synthetic-l1"]').innerText()).includes('SIMULATED 1 ') &&
     (await page.locator('[data-network-layer="synthetic-l2-a"]').innerText()).includes('SIMULATED 2.5 '));
   add('No aggregate balance width '+width,
     (await page.locator('[data-w03-no-aggregate]').innerText()).includes('No cross-network balance total'));
   await page.keyboard.press('Tab');
   const tabTag=await page.evaluate(()=>document.activeElement?.tagName||'');
   add('No tab-accessible wallet action width '+width,
     tabTag==='BODY'||tabTag==='HTML');
   await context.close();
 }
 const cases=[
  {name:'unavailable',selector:'[data-balance-state="unavailable"]',text:'Unavailable'},
  {name:'stale',selector:'[data-balance-state="stale"]',text:'Stale'},
  {name:'zero',selector:'[data-balance-state="observed"]',text:'SIMULATED 0 '},
  {name:'inflight',selector:'[data-network-layer="synthetic-l1"]',text:'NOT a confirmed bridge'},
 ];
 for(const q of cases){
  const {page,context}=await open(q.name,375,830,{screenshot:true});
  const target=page.locator(q.selector);
  add(q.name+' produces a single separate slot',(await target.count())===1);
  add(q.name+' explicitly labeled',(await target.innerText()).includes(q.text));
  await context.close();
 }
 for(const scenario of ['otherAccount','otherRevision','duplicate','forgedContract','hostileAsset','forgedAction']){
   const {page,context}=await open(scenario,390,840,{screenshot:scenario==='otherAccount'});
   add(scenario+' rejects entire untrusted result',
     await page.locator('[data-w03-network-unavailable]').count()===1 &&
     await page.locator('[data-network-layer]').count()===0 &&
     (await page.getByRole('status').innerText()).includes('NOT zero'));
   add(scenario+' cannot show misleading network totals',
     (await page.locator('[data-w03-no-aggregate]').innerText()).includes('No cross-network balance total'));
   add(scenario+' cannot execute injection',
     await page.locator('img,script,[onerror],[onclick],form,button').count()===0);
   await context.close();
 }
 // Viewport-only emulation: not Safari/iOS, screen-reader certification or production UAT.
 const afterRequests=requests.map(r=>({method:r.method,url:r.url,loopbackHostCorrect:r.host==='127.0.0.1:'+port}));
 add('All HTTP requests were GET fixture pages only',
   afterRequests.every(r=>r.method==='GET'&&r.url.startsWith('/s/')&&r.loopbackHostCorrect));
 add('Zero provider or external browser requests',blockedExternal.length===0);
 add('No JavaScript browser errors',errors.length===0);
 const receipt={
   schema:'rhc-w03-task11-browser-qa-v1',
   utc:new Date().toISOString(),base:expectedBase,
   browserEngine:'Chrome Chromium',environment:'local Windows Node task-owned 127.0.0.1 ephemeral HTTP server',
   scope:'Synthetic static SSR only; not Next app route, wallet SDK, connected RHC service or provider',
   checks,pass:checks.filter(x=>x.passed).length,fail:checks.filter(x=>!x.passed).length,
   requestCount:requests.length,blockedExternal,errors,renderedCases:renders,
   screenshots:fs.readdirSync(screenshots).map(name=>({name,sha256:sha(path.join(screenshots,name))})),
   noSigning:true,noTransactions:true,noProviderCalls:true,noRpcCalls:true,
   noCustodialOrRhcAccountOperation:true,
 };
 fs.writeFileSync(path.join(output,'BROWSER-RESULT.json'),JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({pass:receipt.pass,fail:receipt.fail,requestCount:receipt.requestCount,
   screenshotCount:receipt.screenshots.length,external:blockedExternal.length,
   pageErrors:errors.length},null,2));
} catch(err){
 failed=true;exception=err;
 const report={utc:new Date().toISOString(),message:err.message,stack:err.stack,
  partialPass:checks.filter(x=>x.passed).length,checks,requestCount:requests.length,
  blockedExternal,errors};
 fs.writeFileSync(path.join(output,'BROWSER-ERROR.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 console.error(err.stack);
} finally {
 if(browser)await browser.close();
 await new Promise(resolve=>server.close(resolve));
 if(failed)process.exitCode=1;
}
