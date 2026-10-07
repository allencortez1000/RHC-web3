const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const {worktree}=require('./run.cjs');
const generated=['apps/customer-web/.next','apps/admin-web/.next','apps/customer-web/tsconfig.tsbuildinfo','apps/admin-web/tsconfig.tsbuildinfo','apps/api/dist',...['config','types','shared','validation','ui','database','web3'].map(p=>'packages/'+p+'/dist')];
for(const file of generated){
 const tracked=cp.execFileSync('git',['--no-pager','ls-files','--',file],{cwd:worktree,encoding:'utf8',timeout:10000});
 if(tracked.trim())throw Error('Refuse tracked generated path '+file);
 const full=path.join(worktree,file);
 if(fs.existsSync(full)){if(fs.lstatSync(full).isSymbolicLink())throw Error('Refuse symlink '+file);fs.rmSync(full,{recursive:true});}
 console.log('Cleared owned generated output',file);
}
console.log(JSON.stringify({execPath:process.execPath,version:process.version,arch:process.arch,napi:process.versions.napi}));
const swc=require(path.join(worktree,'node_modules/@next/swc-win32-x64-msvc'));
const engine=require(path.join(worktree,'node_modules/@prisma/engines/query_engine-windows.dll.node'));
console.log('Node22 native N-API module loading',Boolean(swc.transformSync),Boolean(engine.QueryEngine));
console.log('No client instantiated; no database connection');
