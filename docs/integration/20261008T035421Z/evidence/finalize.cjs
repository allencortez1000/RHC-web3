// Local evidence finalization; no app or provider requests.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto');
const r=require('./run.cjs'),root=r.worktree,folder=path.dirname(__dirname),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const rel=p=>path.relative(root,p).split(path.sep).join('/');
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
const expected=['apps/admin-web/app/capability-scopes.ts','apps/admin-web/tests/capability-request-coordinator.spec.ts','apps/customer-web/app/components/digital-id-page.tsx','apps/customer-web/app/properties/[id]/page.tsx','apps/customer-web/tests/integration-preparation.spec.ts'].sort();
const comparison=JSON.parse(fs.readFileSync(path.join(__dirname,'preservation-comparison.json')));
const after=JSON.parse(fs.readFileSync(path.join(__dirname,'preservation-after.json')));
const checks=[];function check(name,pass,details){checks.push({name,pass,...(details?{details}:{})});if(!pass)process.exitCode=1;}
check('HEAD/index/staged bytes preserved',comparison.headPreserved&&comparison.indexPreserved&&comparison.stagedPreserved);
check('Only exact frontend/test allowlist changed',JSON.stringify([...comparison.changed].sort())===JSON.stringify(expected)&&!comparison.removed.length&&!comparison.protectedChanges.length,comparison.changed);
const git=cp.spawnSync('git',['--no-pager','--no-optional-locks','diff','--check'],{cwd:root,env:r.environment(),encoding:'utf8',timeout:10000});
check('Diff whitespace check',git.status===0,git.stdout+git.stderr);
const ports=cp.execFileSync('netstat.exe',['-ano'],{encoding:'utf8',timeout:10000}).split('\n').filter(x=>x.includes('LISTENING')&&/:(43101|43102|43103)\s/.test(x));
check('Owned fixture ports have no listeners',ports.length===0,ports);
const ledger=fs.readFileSync(path.join(__dirname,'commands.jsonl'),'utf8').trim().split('\n').map(x=>JSON.parse(x));
check('All bounded commands cleaned owned processes',ledger.every(x=>x.remainingOwned.length===0&&!x.timedOut));
const audits=fs.readdirSync(r.evidence).filter(x=>x.endsWith('-runtime.jsonl'));
const runtime=audits.flatMap(n=>fs.readFileSync(path.join(r.evidence,n),'utf8').trim().split('\n').filter(Boolean).map(x=>JSON.parse(x)));
check('Recorded validation children use selected Node22',runtime.length>0&&runtime.every(x=>x.version==='v22.20.0'&&path.resolve(x.execPath).toLowerCase()===r.executable.toLowerCase()),{records:runtime.length});
for(const file of walk(__dirname).filter(x=>x.endsWith('.cjs'))){const result=cp.spawnSync(r.executable,['--check',file],{env:r.environment(),cwd:root,encoding:'utf8',timeout:10000});check('Syntax '+rel(file),result.status===0,result.stderr);}
for(const name of ['integration-readiness.md','local-smoke-checklist.md'])for(const match of fs.readFileSync(path.join(folder,name),'utf8').matchAll(/\]\(([^)]+)\)/g)){const link=match[1].split('#')[0];if(link&&!/^https?:/.test(link))check('Link '+name+':'+link,fs.existsSync(path.resolve(folder,link)));}
const finalRows=['customer-prep-build-green-01','customer-browser-prep-green-01','customer-browser-prep-full-01','customer-prep-typecheck-01','customer-prep-lint-01','admin-scope-regression-green','admin-production-build','frontend-web3-typecheck','frontend-web3-lint','web3-unit-sdk','ui-frontend-unit','web3-browser','admin-browser-full'];
for(const label of finalRows){const row=ledger.find(x=>x.label===label);check('Final check '+label,Boolean(row&&row.exitCode===0&&!row.error&&!row.timedOut));}
const summary={utc:new Date().toISOString(),local:new Date().toString(),head:after.head,branch:after.branch,execPath:process.execPath,checks,finalCommandResults:ledger.filter(x=>finalRows.includes(x.label)).map(x=>({label:x.label,sourceManifestSha256:x.sourceManifestSha256,exitCode:x.exitCode})),contractComparison:'BLOCKED: named contract/recovery/exact standalone CORS allowlist missing',connectedRequests:0,backendServicesStarted:0};
fs.writeFileSync(path.join(__dirname,'final-checks.json'),JSON.stringify(summary,null,2)+'\n',{flag:'wx'});
const changed=expected.map(p=>({path:p,sha256:hash(fs.readFileSync(path.join(root,p)))}));
const docs=walk(folder).map(p=>({path:rel(p),sha256:hash(fs.readFileSync(p))}));
const logs=fs.readdirSync(r.evidence).filter(n=>/\.(log|jsonl)$/.test(n)).map(n=>({path:n,sha256:hash(fs.readFileSync(path.join(r.evidence,n)))}));
const manifest={utc:summary.utc,head:after.head,branch:after.branch,productChanges:changed,productChangeManifestSha256:hash(JSON.stringify(changed)),finalTestedSourceIdentity:ledger.find(x=>x.label==='admin-browser-full')?.sourceManifestSha256,sourceIdentityDefinition:'SHA256(JSON.stringify(sorted {path,sha256} array of tracked+untracked nonignored files, excluding dotenv and this report folder)); per-command source manifests are external',followUpArtifacts:docs,externalRoot:r.evidence,externalLogs:logs,exclusions:'Own manifest avoids self-reference; ignored .next/dist/node_modules, external traces/runtime/caches and unsaved editor buffers excluded from source identity; no env contents read'};
fs.writeFileSync(path.join(__dirname,'source-evidence-manifest.json'),JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({utc:summary.utc,passed:checks.filter(x=>x.pass).length,failed:checks.filter(x=>!x.pass),changed:expected,productChangeManifestSha256:manifest.productChangeManifestSha256,finalTestedSourceIdentity:manifest.finalTestedSourceIdentity},null,2));
