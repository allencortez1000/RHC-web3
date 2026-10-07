const path=require('node:path'),fs=require('node:fs'),cp=require('node:child_process');
const runner=require('./run.cjs');
const npm=(...args)=>[runner.npmCli,...args];
const phases={
 builds:[
 ['node22-npm',npm('--version'),30000],
 ['node22-prisma-generate',npm('run','db:generate'),120000],
 ['node22-typecheck',npm('run','typecheck'),480000],
 ['node22-build-customer',npm('run','build:customer'),480000],
 ['node22-build-admin',npm('run','build:admin'),480000],
 ['node22-build-api',npm('run','build:api'),480000],
 ],
 tests:[
 ['node22-web3-unit',npm('run','test','-w','@rhc/web3'),120000],
 ['node22-ui-frontend-unit',['--test','packages/ui/test/*.test.cjs','apps/customer-web/tests/frontend-merge-regression.cjs','apps/customer-web/tests/frontend-mode-regression.cjs'],120000],
 ['node22-web3-browser',['scripts/web3-browser-test.mjs'],120000],
 ['node22-frontend-lint',npm('run','lint','-w','@rhc/customer-web','-w','@rhc/admin-web','-w','@rhc/ui','-w','@rhc/web3'),240000],
 ['node22-api-web3-boundary',npm('run','test','-w','@rhc/api','--','--runInBand','--runTestsByPath','test/web3-boundary.spec.ts','test/web3-feature.spec.ts'),120000],
 ['node22-api-security-http',npm('run','test:e2e','-w','@rhc/api','--','--runInBand','--runTestsByPath','test/security.e2e-spec.ts'),120000],
 ],
 browsers:[
 ['node22-customer-browser',npm('run','test:e2e','-w','@rhc/customer-web','--','--reporter=line','--output='+path.join(runner.evidence,'customer-results')),600000,'43102'],
 ['node22-admin-browser',npm('run','test:e2e','-w','@rhc/admin-web','--','--reporter=line','--output='+path.join(runner.evidence,'admin-results')),600000,'43103'],
 ]
};
(async()=>{
 const phase=process.argv[2];if(!phases[phase])throw Error('Use builds, tests or browsers');
 const results=[];
 for(const [label,args,timeout,ports] of phases[phase]){
  if(ports){const lines=cp.execFileSync('netstat.exe',['-ano'],{encoding:'utf8',timeout:10000}).split('\n').filter(x=>x.includes('LISTENING')&&new RegExp(':'+ports+'\\s').test(x));if(lines.length){results.push({label,status:'BLOCKED foreign listener',lines});continue;}}
  results.push(await runner.run(label,args,{timeout,ports}));
 }
 fs.writeFileSync(path.join(__dirname,phase+'-summary.json'),JSON.stringify(results,null,2)+'\n',{flag:'wx'});
 process.exitCode=results.every(r=>r.exitCode===0&&!r.timedOut&&!r.error&&!r.remainingOwned.length)?0:1;
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
