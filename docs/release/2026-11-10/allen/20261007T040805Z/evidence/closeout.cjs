// Finite local verification and manifests. No staging, network or application startup.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto');
const runner=require('./run.cjs');
const root=runner.worktree,follow=path.dirname(__dirname),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const relative=p=>path.relative(root,p).split(path.sep).join('/');
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);
const stamp=()=>({utc:new Date().toISOString(),local:new Date().toString()});
const started=stamp();
if(process.version!=='v22.20.0'||path.resolve(process.execPath).toLowerCase()!==runner.executable.toLowerCase())throw Error('Use selected Node22');
const env=runner.environment();
const checks=[];
function check(name,passed,detail){checks.push({name,passed,...(detail?{detail}:{})});if(!passed)process.exitCode=1;}
const comparison=JSON.parse(fs.readFileSync(path.join(__dirname,'preservation-comparison.json')));
check('Protected source/index/HEAD preserved',comparison.sourceUnchanged&&Object.values(comparison.comparisons).every(x=>Object.values(x).every(Boolean)));
const diff=cp.spawnSync('git',['--no-pager','--no-optional-locks','diff','HEAD','--check'],{cwd:root,env,encoding:'utf8',timeout:10000});
check('git diff HEAD --check',diff.status===0,diff.stdout+diff.stderr);
const listenerLines=cp.execFileSync('netstat.exe',['-ano'],{env,encoding:'utf8',timeout:10000}).split('\n').filter(x=>x.includes('LISTENING')&&/:(3002|3003|43101|43102|43103)\s/.test(x));
check('No listeners on demo/intercepted ports',listenerLines.length===0,listenerLines);
const runtimeFiles=fs.readdirSync(runner.evidence).filter(n=>n.endsWith('-runtime.jsonl'));
const runtimeRows=runtimeFiles.flatMap(n=>fs.readFileSync(path.join(runner.evidence,n),'utf8').trim().split('\n').filter(Boolean).map(x=>JSON.parse(x)));
check('All recorded parent validation children ran selected Node22',runtimeRows.length>0&&runtimeRows.every(x=>x.version==='v22.20.0'&&path.resolve(x.execPath).toLowerCase()===runner.executable.toLowerCase()),{records:runtimeRows.length,files:runtimeFiles.length});
const ledger=fs.readFileSync(path.join(__dirname,'commands.jsonl'),'utf8').trim().split('\n').map(x=>JSON.parse(x));
check('Every recorded bounded run cleaned owned processes',ledger.every(x=>Array.isArray(x.remainingOwned)&&x.remainingOwned.length===0));
for(const file of walk(__dirname).filter(x=>x.endsWith('.cjs'))){
 const result=cp.spawnSync(runner.executable,['--check',file],{env,cwd:root,encoding:'utf8',timeout:10000});
 check('Syntax '+relative(file),result.status===0,result.status===0?undefined:result.stderr);
}
for(const file of walk(__dirname).filter(x=>x.endsWith('.sh'))){
 const result=cp.spawnSync('C:/Program Files/Git/bin/bash.exe',['-n',file],{env,cwd:root,encoding:'utf8',timeout:10000});
 check('Shell syntax '+relative(file),result.status===0,result.status===0?undefined:result.stderr);
}
const closeoutRecord={started,finished:stamp(),execPath:process.execPath,version:process.version,checks,scope:'Read-only source/index comparison, runtime audit, OS ports, syntax; no application requests or new acceptance claims'};
fs.writeFileSync(path.join(__dirname,'closeout-checks.json'),JSON.stringify(closeoutRecord,null,2)+'\n',{flag:'wx'});
const prior=JSON.parse(fs.readFileSync(path.join(root,'docs/release/2026-11-10/allen/20261007T014758Z/run-context.json')));
const product=prior.finalModifiedSource.manifest.map(x=>({...x,sha256:hash(fs.readFileSync(path.join(root,x.path)))}));
const manifestPath=path.join(__dirname,'source-evidence-manifest.json'),allowlistPath=path.join(__dirname,'commit-allowlist.txt');
const all=[...product.map(x=>path.join(root,x.path)),...prior.finalReportPaths.map(x=>path.join(root,x)),...walk(follow),manifestPath,allowlistPath];
const allowlist=[...new Set(all.map(relative))].sort();
fs.writeFileSync(allowlistPath,allowlist.join('\n')+'\n',{flag:'wx'});
const files=allowlist.filter(x=>x!==relative(manifestPath)).map(file=>({path:file,bytes:fs.statSync(path.join(root,file)).size,sha256:hash(fs.readFileSync(path.join(root,file)))}));
const helpers=files.filter(x=>x.path.startsWith(relative(follow)+'/')&&/\.(cjs|sh)$/.test(x.path));
const external=[];
function evidenceFile(file){if(fs.existsSync(file)&&fs.statSync(file).isFile())external.push({path:path.relative(runner.evidence,file).split(path.sep).join('/'),bytes:fs.statSync(file).size,sha256:hash(fs.readFileSync(file))});}
for(const n of fs.readdirSync(runner.evidence))if(/\.(log|jsonl)$/.test(n))evidenceFile(path.join(runner.evidence,n));
const demo=path.join(runner.evidence,'demo');
for(const entry of fs.readdirSync(demo,{withFileTypes:true}))if(entry.isDirectory()){
 const dir=path.join(demo,entry.name);
 if(/^(targeted-summary-|summary-)/.test(entry.name))for(const n of fs.readdirSync(dir))if(/\.(json|md)$/.test(n))evidenceFile(path.join(dir,n));
 if(entry.name.startsWith('attempt-'))for(const n of ['supervisor.json','results.json','expected-outcomes.json','selection.json','processes.jsonl','browser-events.jsonl','store/world.json'])evidenceFile(path.join(dir,n));
}
const manifest={created:stamp(),base:prior.repository.baseSha,branch:prior.repository.taskBranch,productSourceManifestSha256:hash(JSON.stringify(product)),product,followUpExecutableHelpersSha256:hash(JSON.stringify(helpers)),followUpExecutableHelpers:helpers,proposedFileManifestSha256:hash(JSON.stringify(files)),commitAllowlistSha256:hash(fs.readFileSync(allowlistPath)),files,externalEvidenceRoot:runner.evidence,externalEvidence:external,notes:['Product identity includes all 11 modified/new files including untracked regressions.','New untracked validation code is separately included in helper and full proposed-file identities.','The source-evidence-manifest.json file is in the allowlist but excluded from its own digest.','External raw logs, stores, screenshots/profiles/caches/binaries are excluded from commit. Nested demo artifact inventories index screenshots and remaining raw artifacts.','Before/after scope excludes own follow-up folder, ignored artifacts, dotenv contents and unsaved editor buffers.','Tool provisioning/preflight initial work used Node24; all product validation and executed demo use selected Node22.']};
fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});
const broken=[];
for(const name of ['follow-up-validation.md','decisions-and-handoff.md','commit-review.md']){
 const file=path.join(follow,name),text=fs.readFileSync(file,'utf8');
 for(const match of text.matchAll(/\]\(([^)]+)\)/g)){
  const link=match[1].replace(/^<|>$/g,'').split('#')[0];
  if(link&&!/^https?:/.test(link)&&!fs.existsSync(path.resolve(path.dirname(file),decodeURIComponent(link))))broken.push({file:name,link});
 }
}
if(broken.length){console.error('Broken report links',JSON.stringify(broken));process.exitCode=1;}
console.log(JSON.stringify({started,finished:stamp(),checksPassed:checks.filter(x=>x.passed).length,checksFailed:checks.filter(x=>!x.passed),brokenLinks:broken,source:manifest.productSourceManifestSha256,helperIdentity:manifest.followUpExecutableHelpersSha256,proposedIdentity:manifest.proposedFileManifestSha256,allowlistFiles:allowlist.length,externalIndexed:external.length},null,2));
