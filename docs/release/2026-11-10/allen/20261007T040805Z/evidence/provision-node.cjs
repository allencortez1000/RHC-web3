// Portable official runtime only. No package install, app traffic or machine PATH changes.
const fs = require('node:fs'), path = require('node:path'), https = require('node:https'), cp = require('node:child_process'), crypto = require('node:crypto');
const root = path.resolve(__dirname, '../../../../../..');
const tools = path.resolve(root, '../RHC-web3-allen-frontend-web3-evidence/20261007T040805Z/tools');
const name = 'node-v22.20.0-win-x64.zip';
const base = 'https://nodejs.org/dist/v22.20.0/';
async function download(file) {
 const target = path.join(tools, file);
 if(fs.existsSync(target)) throw Error('Refuse overwrite: '+file);
 return new Promise((resolve,reject)=>{
  const req=https.get(base+file,{timeout:60000},res=>{
   if(res.statusCode!==200){res.resume();reject(Error('Official download HTTP '+res.statusCode));return;}
   const out=fs.createWriteStream(target,{flags:'wx'}); res.pipe(out);
   res.on('error',reject);out.on('error',reject);out.on('finish',()=>out.close(()=>resolve(target)));
  }); req.on('timeout',()=>req.destroy(Error('Download timeout')));req.on('error',reject);
 });
}
(async()=>{
 const started = new Date().toISOString();fs.mkdirSync(tools,{recursive:true});
 const sums = await download('SHASUMS256.txt'); const zip = await download(name);
 const expected=fs.readFileSync(sums,'utf8').split('\n').find(line=>line.endsWith('  '+name))?.split(' ')[0];
 const actual=crypto.createHash('sha256').update(fs.readFileSync(zip)).digest('hex');
 if(!expected||actual!==expected)throw Error('Checksum mismatch; do not extract');
 const env={SystemRoot:'C:\\Windows',WINDIR:'C:\\Windows',PATH:'C:\\Windows\\System32;C:\\Windows\\System32\\WindowsPowerShell\\v1.0'};
 cp.execFileSync('C:/Windows/System32/WindowsPowerShell/v1.0/powershell.exe',['-NoProfile','-NonInteractive','-Command',`Expand-Archive -LiteralPath '${zip}' -DestinationPath '${tools}'`],{env,timeout:120000,stdio:'pipe'});
 const exe=path.join(tools,'node-v22.20.0-win-x64/node.exe');
 const executed=JSON.parse(cp.execFileSync(exe,['-p','JSON.stringify({version:process.version,arch:process.arch,execPath:process.execPath})'],{env,encoding:'utf8',timeout:10000}));
 const record={started,finished:new Date().toISOString(),source:base+name,checksumSource:base+'SHASUMS256.txt',expected,actual,verified:actual===expected,selected:'22.20.0 is a compatible selected patch, not a claim of latest',...executed};
 fs.writeFileSync(path.join(__dirname,'node-runtime.json'),JSON.stringify(record,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(record));
})().catch(error=>{console.error(error.message);process.exitCode=1;});
