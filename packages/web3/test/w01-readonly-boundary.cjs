'use strict';
/**
 * W01-P1: offline-only tests for ALREADY IMPLEMENTED, server-side read adapter.
 * Does not enable APPROVED_TESTNETS, authenticate, read RPC, create wallets,
 * sign or transact. Uses Node22 and an injected fake response transport only.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ROOT = 'C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-w01-w02-readonly-20261010';
const W1 = 'C:/Users/admin/Desktop/RHBC project/RHC-web3-allen-frontend-web3';
require(path.join(ROOT,'apps/customer-web/tests/offline-network.cjs'));
const ts = require(require.resolve('typescript',{paths:[W1]}));
const SOURCE = path.join(ROOT,'packages/web3/src') + path.sep;
// Fixture-local transpilation of existing source in memory only.
// This is not an SDK build or approval of a live provider.
const previous = require.extensions['.ts'];
require.extensions['.ts'] = (module,filename) => {
  if(!filename.startsWith(SOURCE)){
    if(previous) return previous(module,filename);
    throw new Error('Unexpected TypeScript module: '+path.basename(filename));
  }
  const js=ts.transpileModule(fs.readFileSync(filename,'utf8'),{
    compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},
  }).outputText;
  module._compile(js,filename);
};
const { createReadProvider } = require(path.join(SOURCE,'index.ts'));
const { readConfig, APPROVED_TESTNETS } = require(path.join(SOURCE,'config.ts'));
const { ThirdwebReadProvider } = require(path.join(SOURCE,'thirdweb-read-provider.ts'));
const { ReadError } = require(path.join(SOURCE,'errors.ts'));
const { createTransport } = require(path.join(SOURCE,'transport.ts'));
const { formatAmount, amountField, observed, unavailable, unsupported, emptyResult } = require(path.join(SOURCE,'snapshot.ts'));
const source=(name)=>fs.readFileSync(path.join(SOURCE,name),'utf8');
const fakeAddress = '0x'+'1'.repeat(40);
const APP = Object.freeze({id:31337,name:'OFFLINE_FIXTURE_ONLY',contractAddress:fakeAddress,
 explorerOrigin:'https://explorer.fixture.test', optionalReads:[],approvalReference:'W01-TEST-NOT_APPROVED'});
const ENV = Object.freeze({RHC_WEB3_PROVIDER:'thirdweb',ENABLE_WEB3_READ_PREVIEW:'true',
 RHC_WEB3_ALLOW_NETWORK_READS:'true',RHC_WEB3_CHAIN_ID:'31337',
 RHC_WEB3_TOKEN_CONTRACT_ADDRESS:fakeAddress,THIRDWEB_SECRET_KEY:'offline-fixture-not-a-real-key'});
const cfg=(override={},app=APP)=>readConfig({...ENV,...override},'test',[app]);
const ready=(c=cfg())=>({...emptyResult(c),snapshot:'fresh',connection:'ready',
 data:{name:observed('UNKNOWN FIXTURE'),symbol:observed('TST'),decimals:observed(18),
  totalSupply:observed({raw:'0',formatted:'0'}),cap:unsupported(),paused:unsupported()},
 block:{number:'50',hash:'0x'+'a'.repeat(64),timestamp:'100',finality:'observed'}});
const jsonResponse=(body,status=200,headers={})=>new Response(
 typeof body==='string'?body:JSON.stringify(body),{status,headers});
const rpc=(fetcher,signal=new AbortController().signal)=>
 createTransport(31337,'fake-client-id','FAKE_PRIVATE_TEST_VALUE',signal,fetcher);
const egress=()=>{
 let count=0;return{called:()=>count,fetcher:async()=>{count++;throw Error('UNEXPECTED EGRESS');}}
};

test('OFF-01 disabled default and empty approval list perform no load/read',async()=>{
 assert.deepEqual(APPROVED_TESTNETS,[]);
 const oldFetch=globalThis.fetch;
 let calls=0;
 globalThis.fetch=()=>{calls++;throw Error('Unexpected real HTTP');};
 try{
   const provider=createReadProvider({},'connected');
   const one=await provider.getTokenSnapshot();
   const two=await provider.getReadStatus();
   assert.equal(one.connection,'disabled');
   assert.equal(one.data,null);
   assert.equal(two.snapshot,'absent');
   const denied=readConfig(ENV,'connected');
   assert.equal(denied.code,'CHAIN_NOT_APPROVED');
   const hardBlocked=createReadProvider(ENV,'connected');
   assert.equal((await hardBlocked.getTokenSnapshot()).data,null);
   assert.equal(calls,0);
 }finally{globalThis.fetch=oldFetch;}
});

test('OFF-02 public env flags cannot authorize testnet; demo-in-connected fails closed',async()=>{
 const claimed=await createReadProvider({...ENV,RHC_APP_PROFILE:'demo'},'connected').getTokenSnapshot();
 assert.equal(claimed.diagnosticCode,'DEMO_EGRESS_BLOCKED');
 for(const flags of [{},{ENABLE_WEB3_READ_PREVIEW:'true'},{RHC_WEB3_ALLOW_NETWORK_READS:'true'}]){
   const c=readConfig({...ENV,...flags},'connected');
   assert.equal(c.code,'CHAIN_NOT_APPROVED');
 }
 const f=readConfig({...ENV,NEXT_PUBLIC_RHC_DATA_MODE:'demo'},'connected');
 assert.equal(f.code,'DEMO_EGRESS_BLOCKED');
});

test('OFF-03 fixture accessible only under explicit local test context',async()=>{
 assert.equal(readConfig({RHC_WEB3_PROVIDER:'fixture'},'connected').code,'FIXTURE_NOT_ALLOWED');
 const read=await createReadProvider({RHC_WEB3_PROVIDER:'fixture'},'test').getTokenSnapshot();
 assert.equal(read.source,'synthetic');
 assert.equal(read.contractAddress,null);
 assert.equal(read.explorerUrl,null);
 assert.equal(read.lastSuccessAt,null);
 assert.equal(read.block,null);
});

test('OFF-04 bad chain, wrong chain and identity failure clear earlier good observation',async()=>{
 for(const chain of ['0','1','-5','31338','0x7a69','31337abc']){
   assert.notEqual(cfg({RHC_WEB3_CHAIN_ID:chain}).code,null,chain);
 }
 let fail=false,time=100000;
 const p=new ThirdwebReadProvider(cfg(),async()=>{
   if(fail)throw new ReadError('WRONG_CHAIN');return ready();
 },()=>time);
 assert.ok((await p.getTokenSnapshot()).data);
 fail=true;time+=30001;
 const result=await p.getTokenSnapshot();
 assert.equal(result.data,null);assert.equal(result.snapshot,'absent');
 assert.equal(result.diagnosticCode,'WRONG_CHAIN');
});

test('OFF-05 exact contract and zero-address source gates block without RPC',()=>{
 const zero='0x'+'0'.repeat(40);
 assert.equal(cfg({RHC_WEB3_TOKEN_CONTRACT_ADDRESS:zero}).code,'CONTRACT_NOT_CONFIGURED');
 assert.equal(cfg({RHC_WEB3_TOKEN_CONTRACT_ADDRESS:'0x'+'2'.repeat(40)}).code,'CONTRACT_NOT_APPROVED');
 assert.equal(cfg({RHC_WEB3_TOKEN_CONTRACT_ADDRESS:'0xbad'}).code,'CONTRACT_NOT_CONFIGURED');
 assert.equal(cfg().valid,true);
 assert.equal(readConfig(ENV,'connected').code,'CHAIN_NOT_APPROVED');
});

test('OFF-06 explorer origin review excludes HTTP credentials path and query',()=>{
 for(const origin of ['http://explorer.fixture.test','https://user:pass@explorer.fixture.test',
  'https://explorer.fixture.test/private','https://explorer.fixture.test/?x=y',
  'https://explorer.fixture.test/#frag']){
   assert.equal(cfg({}, {...APP, explorerOrigin:origin}).code,'INVALID_APPROVAL',origin);
 }
 const status=emptyResult(cfg());
 assert.equal(status.explorerUrl,'https://explorer.fixture.test/address/'+fakeAddress);
});

test('OFF-07 invalid server key fails closed; DTO and errors never echo fixture key',async()=>{
 for(const THIRDWEB_SECRET_KEY of [undefined,'','contains spaces','abc.def','a'.repeat(513)]){
   assert.equal(cfg({THIRDWEB_SECRET_KEY}).code,'SECRET_NOT_CONFIGURED');
 }
 const p=createReadProvider(ENV,'connected');
 assert.doesNotMatch(JSON.stringify(await p.getReadStatus()),/offline-fixture-not-a-real-key/);
 assert.equal(source('config.ts').includes('NEXT_PUBLIC_THIRDWEB_SECRET_KEY'),false);
});

test('OFF-08 transport accepts only four read-only method names, never writes',async()=>{
 const {called,fetcher}=egress();
 const transport=rpc(fetcher);
 for(const method of ['eth_sendTransaction','eth_sendRawTransaction','eth_sign',
  'personal_sign','wallet_sendCalls','eth_signTypedData_v4','eth_subscribe','debug_traceTransaction']){
   await assert.rejects(transport({method}),{code:'BAD_RESPONSE'});
 }
 assert.equal(called(),0);
 const sourceList=source('transport.ts');
 for(const allowed of ['eth_chainId','eth_getBlockByNumber','eth_getCode','eth_call']){
   assert.ok(sourceList.includes(allowed));
 }
 assert.ok(sourceList.includes('const METHODS:'));
});

test('OFF-09 transport forbids redirects, invalid payload and oversize/aborted body',async()=>{
 let headersSeen=false;
 const good=rpc(async(_url,init)=>{
   assert.equal(init.redirect,'error');assert.equal(init.method,'POST');
   assert.equal(init.headers['x-secret-key'],'FAKE_PRIVATE_TEST_VALUE');
   headersSeen=true;
   return jsonResponse({jsonrpc:'2.0',id:1,result:'0x7a69'});
 });
 assert.equal(await good({method:'eth_chainId'}),'0x7a69');
 assert.equal(headersSeen,true);
 for(const invalid of ['not json',{jsonrpc:'2.0',id:999,result:'x'},{jsonrpc:'2.0',id:1}]){
   const fail=rpc(async()=>jsonResponse(invalid));
   await assert.rejects(fail({method:'eth_chainId'}),{code:'BAD_RESPONSE'});
 }
 const over=rpc(async()=>jsonResponse('x'.repeat(262145)));
 await assert.rejects(over({method:'eth_chainId'}),{code:'BAD_RESPONSE'});
 const aborter=new AbortController();aborter.abort();
 const {called,fetcher}=egress();
 await assert.rejects(rpc(fetcher,aborter.signal)({method:'eth_call'}));
 assert.equal(called(),0);
});

test('OFF-10 401/403/429/5xx mapping and retry deadline remain bounded',async()=>{
 const statusExpected=[[401,'PROVIDER_AUTH'],[403,'PROVIDER_AUTH'],[429,'RATE_LIMITED'],
   [502,'TRANSIENT'],[504,'TRANSIENT']];
 for(const [code,expect]of statusExpected){
   const t=rpc(async()=>new Response('',{status:code,headers:{'retry-after':'40'}}));
   await assert.rejects(t({method:'eth_chainId'}),{code:expect});
 }
 let calls=0;
 const p=new ThirdwebReadProvider({...cfg(),timeoutMs:80},async()=>{
   calls++;throw new ReadError('TRANSIENT');
 });
 assert.equal((await p.getTokenSnapshot()).diagnosticCode,'TRANSIENT');
 assert.equal(calls,2);await p.getTokenSnapshot();assert.equal(calls,2);
 const slow=new ThirdwebReadProvider({...cfg(),timeoutMs:40},async(_c,signal)=>
   new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>reject(new ReadError('TIMEOUT')),{once:true})));
 assert.equal((await slow.getTokenSnapshot()).diagnosticCode,'TIMEOUT');
});

test('OFF-11 wrong network / no code / reorg / provider auth invalidate cached metadata',async()=>{
 for(const code of ['WRONG_CHAIN','NO_CONTRACT','REORG','PROVIDER_AUTH']){
   let fail=false,time=100000;
   const p=new ThirdwebReadProvider(cfg(),async()=>{if(fail)throw new ReadError(code);return ready();},()=>time);
   await p.getTokenSnapshot();
   fail=true;time+=30001;
   const result=await p.getTokenSnapshot();
   assert.equal(result.data,null);assert.equal(result.block,null);
   assert.equal(result.diagnosticCode,code);
 }
});

test('OFF-12 optional unsupported/unavailable is never 0/false',()=>{
 assert.deepEqual(unsupported(),{status:'unsupported',value:null});
 assert.deepEqual(unavailable(),{status:'unavailable',value:null});
 assert.deepEqual(amountField(unavailable(),observed(18)),unavailable());
 assert.deepEqual(amountField(observed(0n),unavailable()),observed({raw:'0',formatted:null}));
 const data=ready().data;
 assert.equal(data.cap.status,'unsupported');
 assert.equal(data.paused.value,null);
 assert.ok(!Object.values(data).some(x=>x.value===false));
});

test('OFF-13 SDK source binds all metadata reads to one height; checks end hash',()=>{
 const sdk=source('sdk-snapshot.ts');
 assert.match(sdk,/eth_getBlockByNumber/);
 assert.match(sdk,/block\.number\s*===\s*0n/);
 assert.match(sdk,/blockTag/);
 assert.match(sdk,/hash\s*!==\s*block\.hash/);
 assert.match(sdk,/ReadError\('REORG'\)/);
 assert.match(sdk,/eth_getCode/);
 // Installed-SDK mock-run is a separate suite, not proved by text inspection alone.
});

test('OFF-14 exact amounts and zero/genesis handling never pass token amounts through Number',()=>{
 assert.equal(formatAmount(12345678901234567890123456n,6),'12345678901234567890.123456');
 assert.equal(formatAmount(0n,18),'0');
 assert.equal(formatAmount(1n,255),'0.'+'0'.repeat(254)+'1');
 assert.throws(()=>formatAmount(10n,256));
 assert.match(source('sdk-snapshot.ts'),/block\.number\s*===\s*0n/);
 assert.doesNotMatch(source('snapshot.ts'),/Number\(value\)/);
});

test('OFF-15 TTL/single-flight/max-stale expire and prevent false current health',async()=>{
 let calls=0,now=100000,release;
 const p=new ThirdwebReadProvider(cfg(),async()=>{
   calls++;await new Promise(ok=>{release=ok});return ready();
 },()=>now);
 assert.equal((await p.getReadStatus()).diagnosticCode,'NOT_READ');
 assert.equal(calls,0);
 const runs=Array.from({length:12},()=>p.getTokenSnapshot());
 assert.equal(calls,1);release();
 await Promise.all(runs);
 assert.equal((await p.getTokenSnapshot()).snapshot,'fresh');
 now+=30000;
 assert.equal((await p.getReadStatus()).snapshot,'stale');
 assert.equal(calls,1);
 now+=90000;
 const expiry=await p.getReadStatus();
 assert.equal(expiry.snapshot,'absent');assert.equal(expiry.data,null);
});

test('OFF-25 identity mismatch remains NOT VERIFIED for token metadata; no official claim',()=>{
 const types=fs.readFileSync(path.join(ROOT,'packages/types/src/web3.ts'),'utf8');
 const configSource=source('config.ts');
 const ui=fs.readFileSync(path.join(ROOT,'packages/ui/src/web3-read-panel.tsx'),'utf8');
 assert.ok(!/approvedTokenName|expectedSymbol|expectedDecimals/.test(configSource));
 assert.ok(!/verifiedOfficialToken/.test(types));
 assert.match(ui,/not an official RHC token/i);
 // That explicitly records a known GAP: name/symbol/decimals not matched to signed token specification.
});

test('OFF-26 balanceOf, user holdings and transfer history NOT IMPLEMENTED, never invented',()=>{
 const types=fs.readFileSync(path.join(ROOT,'packages/types/src/web3.ts'),'utf8');
 assert.doesNotMatch(types,/balanceOf|transactionHistory|transferHistory|customerBalance/i);
 assert.ok(!source('sdk-snapshot.ts').includes('balanceOf('));
 assert.ok(!source('sdk-snapshot.ts').includes('getTransactionHistory('));
 const data=ready().data;
 assert.equal(Object.hasOwn(data,'balanceOf'),false);
 assert.equal(Object.hasOwn(data,'transactions'),false);
});

test('OFF-27 RHC Points and Web3 token units never become the same balance',()=>{
 const ui=fs.readFileSync(path.join(ROOT,'packages/ui/src/web3-read-panel.tsx'),'utf8');
 assert.match(ui,/RHC Points remain a separate demo ledger/);
 assert.match(ui,/Total supply is a contract-wide observation/);
 assert.match(ui,/Market price is not established/);
 const dto=ready();
 assert.equal(dto.capability,'read_only');assert.deepEqual(dto.inactiveCapabilities,
   ['customer_wallets','transfers','rewards','sponsorship','public_release']);
});

test('OFF-STATIC externally visible entry imports neither Thirdweb runtime nor signing wallet',()=>{
 for(const n of ['apps/customer-web/app/components/web3-preview.tsx','apps/admin-web/app/integrations/thirdweb-read-panel.tsx','packages/ui/src/web3-read-panel.tsx']){
   const content=fs.readFileSync(path.join(ROOT,n),'utf8');
   assert.doesNotMatch(content,/from ['"]thirdweb|import\(['"]thirdweb|\.signMessage\(|\.sendTransaction\(/);
 }
 assert.match(source('index.ts'),/typeof window !== 'undefined'/);
 const contract=fs.readFileSync(path.join(ROOT,'contracts/README.md'),'utf8');
 assert.match(contract,/only after legal, compliance, and security approval/);
});

test('OFF-STREAM external TCP sockets blocked by installed offline-network guard',()=>{
 const net=require('node:net');
 const socket=new net.Socket();
 try{assert.throws(()=>socket.connect({host:'example.invalid',port:443}),/FRONTEND_OFFLINE/);}
 finally{socket.destroy();}
});
