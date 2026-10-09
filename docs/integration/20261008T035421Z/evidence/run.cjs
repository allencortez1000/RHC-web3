// Integration-preparation runner, versioned from the reviewed closeout runner.
// Offline frontend/Web3 validation only; historical helpers/evidence are unchanged.
const fs = require('node:fs'), path = require('node:path'), cp = require('node:child_process'), crypto = require('node:crypto');
const worktree = path.resolve(__dirname, '../../../..');
const evidence = path.resolve(worktree, '../RHC-web3-allen-frontend-web3-evidence/20261008T035421Z');
const historical = path.join(worktree, 'docs/release/2026-11-10/allen/20261007T040805Z/evidence');
const runtime = path.resolve(evidence, '../20261007T040805Z/tools/node-v22.20.0-win-x64');
const executable = path.join(runtime, 'node.exe');
const npmCli = path.join(runtime, 'node_modules/npm/bin/npm-cli.js');
const previous = path.resolve(evidence, '../20261007T014758Z');
const ownership = require(path.join(historical, 'demo/boundary.cjs'));
const hash = b => crypto.createHash('sha256').update(b).digest('hex');
function assertDotenv() {
 const dirs=['','apps/customer-web','apps/admin-web','apps/api','packages/database'];
 const found=dirs.flatMap(dir=>fs.readdirSync(path.join(worktree,dir)).filter(n=>n.startsWith('.env')&&!n.endsWith('.example')).map(n=>path.join(dir,n)));
 if(found.length)throw Error('BLOCKED automatic dotenv paths: '+found.join(', '));
 for(const dir of ['','apps/customer-web','apps/admin-web','apps/api','packages/database']) if(fs.existsSync(path.join(worktree,dir,'.npmrc')))throw Error('BLOCKED unreviewed project npm configuration path: '+dir);
}
function environment(mode='offline') {
 if(mode!=='offline')throw Error('Only offline execution permitted');
 const home=path.join(evidence,'home'),temp=path.join(evidence,'temp');
 for(const dir of [home,temp,path.join(evidence,'npm-cache')])fs.mkdirSync(dir,{recursive:true});
 for(const name of ['empty-user.npmrc','empty-global.npmrc'])if(!fs.existsSync(path.join(evidence,name)))fs.writeFileSync(path.join(evidence,name),'',{flag:'wx'});
 return {SystemRoot:'C:\\Windows',WINDIR:'C:\\Windows',COMSPEC:'C:\\Windows\\System32\\cmd.exe',PATHEXT:'.COM;.EXE;.BAT;.CMD',PATH:[runtime,'C:\\Windows\\System32','C:\\Windows','C:\\Windows\\System32\\WindowsPowerShell\\v1.0','C:\\Program Files\\Git\\cmd'].join(';'),USERPROFILE:home,HOME:home,APPDATA:home,LOCALAPPDATA:home,TEMP:temp,TMP:temp,CI:'1',NEXT_TELEMETRY_DISABLED:'1',DO_NOT_TRACK:'1',CHECKPOINT_DISABLE:'1',PRISMA_QUERY_ENGINE_LIBRARY:path.join(worktree,'node_modules/@prisma/engines/query_engine-windows.dll.node'),PRISMA_SCHEMA_ENGINE_BINARY:path.join(worktree,'node_modules/@prisma/engines/schema-engine-windows.exe'),PRISMA_HIDE_UPDATE_MESSAGE:'1',NPM_CONFIG_USERCONFIG:path.join(evidence,'empty-user.npmrc'),NPM_CONFIG_GLOBALCONFIG:path.join(evidence,'empty-global.npmrc'),NPM_CONFIG_CACHE:path.join(evidence,'npm-cache'),NPM_CONFIG_REGISTRY:'https://registry.npmjs.org/',NPM_CONFIG_IGNORE_SCRIPTS:'true',NPM_CONFIG_AUDIT:'false',NPM_CONFIG_FUND:'false',PLAYWRIGHT_BROWSERS_PATH:path.join(previous,'browsers'),DATABASE_URL:'postgresql://synthetic:synthetic@127.0.0.1:1/rhc_inert?schema=public',DIRECT_URL:'postgresql://synthetic:synthetic@127.0.0.1:1/rhc_inert?schema=public',RHC_WEB3_MODE:'disabled',NEXT_PUBLIC_RHC_DATA_MODE:'api',NEXT_PUBLIC_API_URL:'http://127.0.0.1:43101/api/v1',NEXT_PUBLIC_SUPABASE_URL:'https://rhc-e2e.supabase.co',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'synthetic-public-e2e-key',NEXT_PUBLIC_CUSTOMER_WEB_URL:'http://127.0.0.1:43102',NEXT_PUBLIC_ADMIN_WEB_URL:'http://127.0.0.1:43103',NODE_OPTIONS:'--require '+JSON.stringify(path.join(historical,'offline.cjs'))};
}
function identity(){
 const output=cp.execFileSync('git',['--no-pager','--no-optional-locks','ls-files','--cached','--others','--exclude-standard','-z'],{cwd:worktree,encoding:'utf8',timeout:10000});
 const files=[...new Set(output.split('\0').filter(p=>p&&!p.startsWith('docs/integration/20261008T035421Z/')&&!/(^|\/)\.env($|\.)/.test(p)))].sort();
 const manifest=files.map(p=>({path:p,sha256:hash(fs.readFileSync(path.join(worktree,p)))}));
 const actual=hash(JSON.stringify(manifest));fs.mkdirSync(evidence,{recursive:true});
 const target=path.join(evidence,'source-'+actual+'.json');if(!fs.existsSync(target))fs.writeFileSync(target,JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});
 return actual;
}
async function run(label,args,options={}) {
 if(!/^[a-z0-9-]+$/.test(label))throw Error('Safe unique label required');
 assertDotenv();
 if(process.version!=='v22.20.0'||path.resolve(process.execPath).toLowerCase()!==executable.toLowerCase())throw Error('Invoke runner with selected absolute Node22 executable');
 if(options.ports){
  const lines=cp.execFileSync('netstat.exe',['-ano'],{encoding:'utf8',timeout:10000}).split('\n');
  if(lines.some(x=>x.includes('LISTENING')&&new RegExp(':('+options.ports.split(',').join('|')+')\\s').test(x)))throw Error('BLOCKED occupied fixture port; never reuse/kill foreign listener');
 }
 const sourceManifestSha256=identity(),started=new Date(),timeout=options.timeout||600000;
 const log=path.join(evidence,label+'.log'),audit=path.join(evidence,label+'-runtime.jsonl');
 const fd=fs.openSync(log,'wx');
 const env={...environment(),RHC_RUNTIME_LOG:audit,RHC_FIXTURE_PORTS:options.ports||''};
 const child=cp.spawn(executable,args,{cwd:worktree,env,stdio:['ignore',fd,fd],windowsHide:true,shell:false});
 const known=new Map();let rootBorn,error,timedOut=false;
 function inspect(){const all=ownership.processes();const root=all.find(p=>p.pid===child.pid);if(root&&!rootBorn)rootBorn=root.born;if(root&&root.born===rootBorn)for(const p of ownership.descendants(child.pid,all))known.set(p.pid,p);}
 function stop(){
  inspect();const live=ownership.processes();
  for(const p of [...known.values()].reverse())if(live.some(x=>x.pid===p.pid&&x.born===p.born))try{cp.execFileSync('C:/Windows/System32/taskkill.exe',['/PID',String(p.pid),'/F'],{env,stdio:'pipe',timeout:5000,windowsHide:true});}catch(e){if(ownership.processes().some(x=>x.pid===p.pid&&x.born===p.born))error='Cleanup failed: '+e.message;}
 }
 child.on('error',e=>{error=e.message;});
 const timer=setTimeout(()=>{timedOut=true;stop();},timeout);
 const poll=setInterval(()=>{try{inspect();}catch(e){error='Ownership inspection failed: '+e.message;}},4000);
 const result=await new Promise(resolve=>child.on('close',(code,signal)=>resolve({code,signal})));
 clearTimeout(timer);clearInterval(poll);stop();fs.closeSync(fd);
 const remaining=ownership.processes().filter(p=>known.get(p.pid)?.born===p.born);
 const row={label,started:started.toISOString(),startedLocal:started.toString(),finished:new Date().toISOString(),durationMs:Date.now()-started.getTime(),cwd:worktree,executable,args,timeoutMs:timeout,mode:'offline',sourceManifestSha256,exitCode:result.code,signal:result.signal,timedOut,error,remainingOwned:remaining,log,runtimeAudit:audit};
 fs.appendFileSync(path.join(__dirname,'commands.jsonl'),JSON.stringify(row)+'\n');console.log(JSON.stringify(row));
 console.log(fs.readFileSync(log,'utf8').split('\n').map(line=>line.includes('"PATH":')&&line.includes('DATABASE_URL')?'[Synthetic child environment argument omitted; assertion retained in external log]':line).join('\n'));
 return row;
}
module.exports={worktree,evidence,npmCli,executable,environment,run};
if(require.main===module){const [label,mode,timeout,...args]=process.argv.slice(2);if(mode!=='offline')throw Error('Offline required');const ports=label.includes('customer-browser')?'43102':label.includes('admin-browser')?'43103':'';run(label,args,{timeout:Number(timeout),ports}).then(r=>{process.exitCode=r.exitCode===0&&!r.timedOut&&!r.error&&!r.remainingOwned.length?0:1;}).catch(e=>{console.error(e.message);process.exitCode=1;});}
