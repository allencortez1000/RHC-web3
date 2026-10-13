"use strict";
const fs=require("node:fs"),path=require("node:path"),{pathToFileURL}=require("node:url");
const repo=path.resolve(__dirname,"../../../../../..");
const deps=path.join(repo,"node_modules");
const {chromium}=require(path.join(deps,"playwright"));
const evidence=path.join(path.dirname(repo),"RHC-web3-allen-wallet-w2a-20261009-evidence/w03-2e-controller-fence-20261013/inherited-hydrated");
const output=path.join(evidence,"repro-run");
if(!fs.existsSync(evidence)||fs.existsSync(output))throw Error("Evidence prerequisite or output already exists");
fs.mkdirSync(output);
const html=path.join(evidence,"interactive-preview","index.html");
const tests=[],external=[],pageErrors=[],a11y=[];
function check(name,ok,details=""){
 tests.push({name,result:ok?"PASS":"FAIL",details:String(details)});
 console.log((ok?"PASS":"FAIL")+" "+name+(details?" "+details:""));
}
function equal(name,a,b){check(name,a===b,JSON.stringify({actual:a,expected:b}));}
function assertIncludes(name,s,needle){check(name,s.includes(needle),needle);}
function assertExcludes(name,s,needle){check(name,!s.includes(needle),needle);}
function abortIfFailures() {
 const failed=tests.filter(x=>x.result==="FAIL");
 if(failed.length)throw Error("Browser assertions failed ("+failed.length+"): "+failed.map(x=>x.name).join("; "));
}
(async()=>{
 const browser=await chromium.launch({executablePath:"C:/Program Files/Google/Chrome/Application/chrome.exe",headless:true,
   args:["--no-sandbox","--no-first-run","--disable-background-networking","--disable-component-update"]});
 const fileUrl=pathToFileURL(html).href;
 async function open(width=1280,height=820,a11yOnlyBypassCSP=false){
  const context=await browser.newContext({viewport:{width,height},reducedMotion:"reduce",serviceWorkers:"block",bypassCSP:a11yOnlyBypassCSP});
  await context.setOffline(true);
  await context.route("**/*",route=>{
   const u=route.request().url();
   if(u.startsWith("file:"))return route.continue();
   external.push(u);return route.abort();
  });
  const page=await context.newPage();
  page.setDefaultTimeout(8000);
  page.on("pageerror",err=>pageErrors.push(err.message));
  page.on("console",msg=>{if(msg.type()==="error")pageErrors.push(msg.text())});
  await page.goto(fileUrl,{waitUntil:"load",timeout:20000});
  await page.locator("[data-w03-2d-synthetic-probe]").waitFor();
  await page.waitForFunction(()=>window.__RHC_W03_2D_QA__?.pending()===1);
  return {page,context};
 }
 async function text(page){return await page.locator("section[aria-label='RHC wallet offline review']").innerText();}
 async function pending(page){return await page.evaluate(()=>window.__RHC_W03_2D_QA__?.pending());}
 async function resolve(page,index,scenario,id,epoch){
  return page.evaluate(x=>window.__RHC_W03_2D_QA__.resolve(x.index,x.scenario,x.id,x.epoch),{index,scenario,id,epoch});
 }
 async function pollText(page,value){
  await page.waitForFunction(s=>document.querySelector("section[aria-label='RHC wallet offline review']")?.textContent?.includes(s),value);
 }
 try{
  // Case 1: baseline and first completion
  {
   const {page,context}=await open();
   equal("initial mock QA state",await page.locator("[data-w03-state]").getAttribute("data-w03-state"),"loading");
   equal("first deferred request count",await pending(page),1);
   assertExcludes("first load hides balance",await text(page),"125.00");
   await page.locator('[data-action="resolve-points"]').click();
   await pollText(page,"SIMULATED RHC Points: 125.00");
   equal("observed mock fixture mode",await page.locator("[data-w03-state]").getAttribute("data-w03-state"),"fixture");
   assertIncludes("points labeled invented",await text(page),"SIMULATED RHC Points: 125.00");
   assertIncludes("token explicitly not approved",await text(page),"RHC token not approved");
   await page.screenshot({path:path.join(output,"hydrated-points-desktop.png"),fullPage:true,animations:"disabled"});
   await context.close();
  }
  // Case 2: account A->B after A had values: must be erased synchronously
  {
   const {page,context}=await open();
   await resolve(page,0,"points","A",1);await pollText(page,"125.00");
   await page.locator('[data-action="switch-B"]').click();
   await page.waitForFunction(()=>window.__RHC_W03_2D_QA__?.pending()===2);
   assertExcludes("user B switch clears previous A points",await text(page),"125.00");
   assertIncludes("user B selected",await page.locator("[data-qa-user]").innerText(),"synthetic-customer-B");
   await page.locator('[data-action="resolve-zero"]').click();
   await pollText(page,"SIMULATED RHC Points: 0.00");
   assertExcludes("user B zero has no A balance",await text(page),"125.00");
   await context.close();
  }
  // Case 3: old A returns AFTER B, must not overwrite B.
  {
   const {page,context}=await open();
   await page.locator('[data-action="switch-B"]').click();
   await page.waitForFunction(()=>window.__RHC_W03_2D_QA__?.pending()===2);
   await resolve(page,1,"zero","B",2);await pollText(page,"SIMULATED RHC Points: 0.00");
   await resolve(page,0,"points","A",1);
   await page.waitForTimeout(100);
   assertIncludes("late A result cannot remove B zero",await text(page),"SIMULATED RHC Points: 0.00");
   assertExcludes("late A result cannot leak A 125",await text(page),"125.00");
   await context.close();
  }
  // Case 4: session refresh invalidates prior data.
  {
   const {page,context}=await open();
   await resolve(page,0,"points","A",1);await pollText(page,"125.00");
   await page.locator('[data-action="new-session"]').click();
   await page.waitForFunction(()=>window.__RHC_W03_2D_QA__?.pending()===2);
   assertExcludes("session epoch refresh clears old points",await text(page),"125.00");
   await resolve(page,1,"zero","A",2);
   await pollText(page,"SIMULATED RHC Points: 0.00");
   await context.close();
  }
  // Case 5: error and HTTP-like negative state simulations.
  const failureButtons=[
   {name:"401 expired session",action:"reject-401",expect:"authenticated RHC session"},
   {name:"403 forbidden",action:"reject-403",expect:"not authorized"},
   {name:"429 rate limit",action:"reject-429",expect:"limit reached"},
   {name:"503 outage",action:"reject-503",expect:"service is offline"},
   {name:"cross-user payload",action:"wrong-customer",expect:"Account state changed"},
   {name:"unapproved Thirdweb source",action:"bad-token",expect:"overview unavailable"}
  ];
  for(const entry of failureButtons){
   const {page,context}=await open(390,844);
   await page.locator('[data-action="'+entry.action+'"]').click();
   await pollText(page,entry.expect);
   assertIncludes(entry.name+" fail-closed visible reason",await text(page),entry.expect);
   assertExcludes(entry.name+" no synthetic point fallback",await text(page),"125.00");
   equal(entry.name+" data unavailable",await page.locator("[data-w03-state]").getAttribute("data-w03-state"),"unavailable");
   await context.close();
  }
  // Case 6: first show 125 then unavailable connected backend.
  {
   const {page,context}=await open();
   await resolve(page,0,"points","A",1);await pollText(page,"125.00");
   await page.locator('[data-action="backend-pending"]').click();
   await pollText(page,"required service is offline");
   assertExcludes("backend pending never preserves demo balances",await text(page),"125.00");
   equal("backend pending hard disabled",await page.locator("[data-w03-2c-mode]").getAttribute("data-w03-2c-mode"),"backend_pending");
   await page.locator('[data-action="mock-only"]').click();
   await page.waitForFunction(()=>window.__RHC_W03_2D_QA__?.pending()===2);
   assertExcludes("resume mock starts empty",await text(page),"125.00");
   await page.locator('[data-action="resolve-points"]').click();
   await pollText(page,"125.00");
   await context.close();
  }
  // Case 7: simulated provider lifecycle never grants wallet permissions.
  {
   const {page,context}=await open();
   await page.locator('[data-action="mock-connect"]').click();
   assertIncludes("mock connection displayed",await page.locator("[data-qa-provider]").innerText(),"connected_simulation");
   const permission=await page.locator("[data-qa-capabilities]").innerText();
   assertIncludes("cannot sign",permission,"No wallet signing: false");
   assertIncludes("cannot transact",permission,"No transactions: false");
   assertIncludes("link not verified",permission,"No verified RHC link: false");
   await page.locator('[data-action="mock-wrong-chain"]').click();
   assertIncludes("simulated wrong chain",await page.locator("[data-qa-provider]").innerText(),"unsupported_network");
   await page.locator('[data-action="mock-disconnect"]').click();
   assertIncludes("simulated disconnect",await page.locator("[data-qa-provider]").innerText(),"disconnected");
   await context.close();
  }
  // Case 8: responsive keyboard/controls and synthetic CSP across widths.
  for(const viewport of [{label:"wide",width:1440,height:900},{label:"mobile",width:390,height:844},{label:"small",width:320,height:640}]){
   const {page,context}=await open(viewport.width,viewport.height);
   await page.locator('[data-action="resolve-points"]').click();
   await pollText(page,"125.00");
   const layout=await page.evaluate(()=>{
    const buttons=[...document.querySelectorAll("button")];
    return {scroll:document.documentElement.scrollWidth,width:innerWidth,
      controls:buttons.length,smallestTarget:Math.min(...buttons.map(b=>b.getBoundingClientRect().height)),
      h1:document.querySelectorAll("h1").length,
      main:document.querySelectorAll("main").length,
      liveError:document.querySelector('[role="status"]')?.textContent??"",
      illegalActions:document.querySelectorAll("a[href],form,input[type=password]").length};
   });
   check(viewport.label+" no horizontal overflow",layout.scroll<=layout.width+1,layout.scroll+"/"+layout.width);
   check(viewport.label+" accessible QA control height",layout.smallestTarget>=43.5,layout.smallestTarget);
   equal(viewport.label+" one main landmark",layout.main,1);
   equal(viewport.label+" one level-1 heading",layout.h1,1);
   check(viewport.label+" only QA controls present",layout.controls>=16&&layout.illegalActions===0,layout.controls);
   await page.screenshot({path:path.join(output,"hydrated-"+viewport.label+".png"),fullPage:true,animations:"disabled"});
   await context.close();
  }
  // Case 9: bypass CSP ONLY in a separate dedicated audit context to inject axe.
  // All preceding functional browser flows enforce the HTML CSP unchanged.
  {
   const {page,context}=await open(390,844,true);
   await page.locator('[data-action="resolve-points"]').click();await pollText(page,"125.00");
   let audit={kind:"incomplete",issues:[]};
   try{
    const src=fs.readFileSync(path.join(deps,"axe-core","axe.min.js"),"utf8");
    await page.addScriptTag({content:src});
    audit=await page.evaluate(async()=>Promise.race([
     window.axe.run(document,{runOnly:{type:"tag",values:["wcag2a","wcag2aa","wcag21a","wcag21aa","wcag22aa","best-practice"]}})
       .then(x=>({kind:"finished",issues:x.violations.map(v=>({id:v.id,impact:v.impact})),
         incomplete:x.incomplete.map(v=>({id:v.id,count:v.nodes.length}))})),
     new Promise(resolve=>setTimeout(()=>resolve({kind:"timeout",issues:[]}),8000)),
    ]));
   }catch(e){audit={kind:"error",issues:[],error:String(e)}}
   a11y.push(audit);
   check("hydrated axe completed",audit.kind==="finished",audit.kind);
   if(audit.kind==="finished")check("hydrated axe zero confirmed violations",audit.issues.length===0,audit.issues.map(x=>x.id).join(", "));
   await context.close();
  }
  equal("all scenarios made zero HTTP/RPC/provider requests",external.length,0);
  equal("all scenarios raised zero runtime errors",pageErrors.length,0);
  const report={schema:"rhc-w03-2d-react-hydrated-local-qa-v1",atUtc:new Date().toISOString(),
   tests,passed:tests.filter(x=>x.result==="PASS").length,failed:tests.filter(x=>x.result==="FAIL"),
   externalRequests:external,errors:pageErrors,accessibility:a11y,
   scope:"synthetic-offline-browser-only",realRhcSessions:0,thirdwebSdkCalls:0,
   walletSignatures:0,transactions:0,connectedAcceptance:false,
   note:"Browser hydration and synthetic interaction checks; not a live RHC API/Thirdweb test."};
  fs.writeFileSync(path.join(output,"HYDRATED-BROWSER-RESULTS.json"),JSON.stringify(report,null,2)+"\n",{flag:"wx",encoding:"utf8"});
  console.log("SUMMARY PASSED="+report.passed+" FAILED="+report.failed.length+" TOTAL="+tests.length);
  abortIfFailures();
 }finally{await browser.close()}
})().catch(e=>{console.error("QA_FAILED: "+e.stack);process.exitCode=2});
