// Frontend/Web3 only. No API build/start, database codegen or runtime calls.
const path=require('node:path'),fs=require('node:fs');
const r=require('./run.cjs'),npm=(...args)=>[r.npmCli,...args];
const steps=[
 ['admin-production-build',npm('run','build','-w','@rhc/admin-web'),480000],
 ['frontend-web3-typecheck',npm('run','typecheck','-w','@rhc/customer-web','-w','@rhc/admin-web','-w','@rhc/ui','-w','@rhc/web3'),240000],
 ['frontend-web3-lint',npm('run','lint','-w','@rhc/customer-web','-w','@rhc/admin-web','-w','@rhc/ui','-w','@rhc/web3'),240000],
 ['web3-unit-sdk',npm('run','test','-w','@rhc/web3'),120000],
 ['ui-frontend-unit',['--test','packages/ui/test/*.test.cjs','apps/customer-web/tests/frontend-merge-regression.cjs','apps/customer-web/tests/frontend-mode-regression.cjs'],120000],
 ['web3-browser',['scripts/web3-browser-test.mjs'],120000],
 ['admin-browser-full',npm('run','test:e2e','-w','@rhc/admin-web','--','--reporter=line','--output='+path.join(r.evidence,'admin-browser-results')),600000,'43103'],
];
(async()=>{const rows=[];for(const[label,args,timeout,ports]of steps)rows.push(await r.run(label,args,{timeout,ports}));fs.writeFileSync(path.join(__dirname,'validation-summary.json'),JSON.stringify(rows,null,2)+'\n',{flag:'wx'});process.exitCode=rows.every(x=>x.exitCode===0&&!x.timedOut&&!x.error&&!x.remainingOwned.length)?0:1;})().catch(e=>{console.error(e.message);process.exitCode=1;});
