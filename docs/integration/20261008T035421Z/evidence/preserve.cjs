const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../../../..'),own='docs/integration/20261008T035421Z/';
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const git=(...args)=>cp.execFileSync('git',['--no-pager','--no-optional-locks',...args],{cwd:root,encoding:'utf8',timeout:10000});
const phase=process.argv[2];if(!['before','after'].includes(phase))throw Error('before/after required');
const tracked=git('ls-files','-z').split('\0').filter(Boolean),untracked=git('ls-files','--others','--exclude-standard','-z').split('\0').filter(x=>x&&!x.startsWith(own));
const gd=git('rev-parse','--absolute-git-dir').trim();
const files=[...new Set([...tracked,...untracked])].sort().map(p=>({path:p,sha256:/(^|\/)\.env($|\.)/.test(p)?'excluded-dotenv':fs.existsSync(path.join(root,p))?hash(fs.readFileSync(path.join(root,p))):null}));
const record={utc:new Date().toISOString(),local:new Date().toString(),head:git('rev-parse','HEAD').trim(),branch:git('branch','--show-current').trim(),indexSha256:hash(fs.readFileSync(path.join(gd,'index'))),staged:git('diff','--cached','--name-status'),tracked,untracked,files,sourceIdentity:hash(JSON.stringify(files)),active:['MERGE_HEAD','CHERRY_PICK_HEAD','REVERT_HEAD','rebase-merge','rebase-apply','sequencer','index.lock'].filter(n=>fs.existsSync(path.join(gd,n))),scope:'Tracked/nonignored source bytes; new follow-up folder separately manifested; dotenv contents, ignored builds and unsaved buffers excluded'};
fs.writeFileSync(path.join(__dirname,'preservation-'+phase+'.json'),JSON.stringify(record,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({phase,utc:record.utc,head:record.head,sourceIdentity:record.sourceIdentity,indexSha256:record.indexSha256,active:record.active}));
if(phase==='after'){
 const before=JSON.parse(fs.readFileSync(path.join(__dirname,'preservation-before.json'))),m=new Map(before.files.map(x=>[x.path,x.sha256]));
 const changed=files.filter(x=>m.get(x.path)!==x.sha256).map(x=>x.path);
 const removed=before.files.filter(x=>!files.some(y=>y.path===x.path)).map(x=>x.path);
 const comparison={utc:record.utc,headPreserved:before.head===record.head,indexPreserved:before.indexSha256===record.indexSha256,stagedPreserved:before.staged===record.staged,changed,removed,protectedChanges:changed.filter(p=>!p.startsWith('apps/customer-web/')&&!p.startsWith('apps/admin-web/'))};
 fs.writeFileSync(path.join(__dirname,'preservation-comparison.json'),JSON.stringify(comparison,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(comparison));
}
