"use strict";
/**
 * Hydrated React render-phase privacy regression:
 * capture text during a layout effect after controller replacement but before
 * the child passive effect can clear the old value.
 */
const fs=require("node:fs"),path=require("node:path"),{pathToFileURL}=require("node:url");
const {chromium}=require("C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-vercel-diagnostic-20261012/node_modules/playwright");
const root="C:/Users/admin/Desktop/RHBC project";
const stage=process.argv[2];
if(!["before","after"].includes(stage))throw Error("Unsupported stage");
const dir=path.join(root,"RHC-web3-allen-wallet-w2a-20261009-evidence/w03-2e-controller-fence-20261013",
  stage==="before"?"repro-before":"verified-after");
const assertions=[],outside=[],errors=[];
function check(name,ok,detail=""){
 assertions.push({name,result:ok?"PASS":"FAIL",detail:String(detail)});
 console.log((ok?"PASS":"FAIL")+" "+name+(detail?" "+detail:""));
}
(async()=>{
 const browser=await chromium.launch({executablePath:"C:/Program Files/Google/Chrome/Application/chrome.exe",
   headless:true,args:["--no-sandbox","--no-first-run","--disable-background-networking"]});
 try{
  for(const width of [1280,390]){
   const context=await browser.newContext({viewport:{width,height:820},serviceWorkers:"block",reducedMotion:"reduce"});
   await context.setOffline(true);
   await context.route("**/*",route=>{
    if(route.request().url().startsWith("file:"))return route.continue();
    outside.push(route.request().url());return route.abort();
   });
   const page=await context.newPage();
   page.on("pageerror",x=>errors.push(x.message));
   page.on("console",msg=>{if(msg.type()==="error")errors.push(msg.text())});
   await page.goto(pathToFileURL(path.join(dir,"index.html")).href,{waitUntil:"load",timeout:18000});
   const wallet=page.locator('[data-w03-2c-lab]');
   await wallet.waitFor({timeout:12000});
   await page.getByText("SIMULATED RHC Points: 125.00").waitFor({timeout:12000});
   check(width+" initial fictional points shown", (await wallet.innerText()).includes("125.00"));
   const oldScope=await page.locator('[data-w03-2c-mode]').getAttribute('data-w03-2c-mode');
   check(width+" mock-only mode confirmed",oldScope==="synthetic");
   await page.locator('[data-qa-swap-controller]').click();
   await page.waitForFunction(()=>window.__RHC_W03_2E_PROBE__?.sequence===1);
   const info=await page.evaluate(()=>window.__RHC_W03_2E_PROBE__);
   check(width+" pre-passive controller swap never exposed previous balance",
     info.prePassiveHadOldPoints===false,
     JSON.stringify({leak:info.prePassiveHadOldPoints,snapshot:info.snapshotText.slice(0,75)}));
   await page.waitForFunction(()=>{
    const el=document.querySelector('[data-w03-2c-lab] [data-w03-state]');
    return el?.getAttribute("data-w03-state")==="loading"||el?.getAttribute("data-w03-state")==="unavailable";
   },{timeout:8000});
   const current=await wallet.innerText();
   check(width+" after swap old points are absent",!current.includes("125.00"));
   check(width+" account identity retained as synthetic",documentDoesNotContainRealIdentity(current));
   const layout=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:innerWidth}));
   check(width+" no horizontal overflow",layout.scroll<=layout.width+1,layout.scroll+"/"+layout.width);
   await page.screenshot({path:path.join(dir,"swap-"+width+".png"),fullPage:true,animations:"disabled"});
   await context.close();
  }
  check("no external API/Thirdweb/RPC requests",outside.length===0,JSON.stringify(outside));
  check("no uncaught browser errors",errors.length===0,JSON.stringify(errors));
  const results={schema:"rhc-w03-2e-controller-identity-render-fence-v1",stage,
   atUtc:new Date().toISOString(),assertions,
   passed:assertions.filter(x=>x.result==="PASS").length,
   failed:assertions.filter(x=>x.result==="FAIL"),
   outside,errors,realBackendCalls:0,realWalletCalls:0};
  fs.writeFileSync(path.join(dir,"CONTROLLER-SWAP-QA.json"),JSON.stringify(results,null,2)+"\n",{flag:"wx",encoding:"utf8"});
  console.log("SUMMARY PASSED="+results.passed+" FAILED="+results.failed.length);
  if(results.failed.length)process.exitCode=1;
 }finally{await browser.close()}
})().catch(e=>{console.error(e.stack);process.exitCode=2});
function documentDoesNotContainRealIdentity(s){
 return !s.includes("550e8400-e29b")&&!s.includes("user@example.com");
}
