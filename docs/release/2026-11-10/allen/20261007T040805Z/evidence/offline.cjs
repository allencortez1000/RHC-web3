// Validation-only preload: exact fixture ports plus ephemeral servers owned by this process.
const fs = require('node:fs'), net = require('node:net'), path = require('node:path');
const expected = path.resolve(__dirname, '../../../../../../../RHC-web3-allen-frontend-web3-evidence/20261007T040805Z/tools/node-v22.20.0-win-x64/node.exe');
if (process.version !== 'v22.20.0' || path.resolve(process.execPath).toLowerCase() !== expected.toLowerCase()) throw Error('Unexpected validation Node runtime');
if(process.env.RHC_RUNTIME_LOG) fs.appendFileSync(process.env.RHC_RUNTIME_LOG,JSON.stringify({utc:new Date().toISOString(),pid:process.pid,ppid:process.ppid,execPath:process.execPath,version:process.version,entry:process.argv[1]||null})+'\n');
const allowed = new Set((process.env.RHC_FIXTURE_PORTS || '').split(',').filter(Boolean).map(Number));
const owned = new Map();
const listen = net.Server.prototype.listen;
net.Server.prototype.listen = function (...args) {
 const register=()=>{const a=this.address();if(a&&typeof a==='object')owned.set(this,a.port);};
 this.once('listening',register);
 this.once('close',()=>owned.delete(this));
 const result=listen.apply(this,args);
 // Supertest reads address() and connects synchronously before the listening event.
 register();
 return result;
};
const connect=net.Socket.prototype.connect;
net.Socket.prototype.connect=function(...args){
 const a=Array.isArray(args[0])?args[0]:args;
 const o=a[0]&&typeof a[0]==='object'?a[0]:{port:a[0],host:typeof a[1]==='string'?a[1]:undefined};
 const host=String(o.host||'localhost').toLowerCase(),port=Number(o.port);
 if(o.path || !['localhost','127.0.0.1','::1','[::1]'].includes(host) || (!allowed.has(port)&&![...owned.values()].includes(port))) throw Error('FOLLOWUP_OFFLINE: unexpected socket denied');
 return connect.apply(this,args);
};
require('node:tls').connect=()=>{throw Error('FOLLOWUP_OFFLINE: TLS denied');};
require('node:dgram').createSocket=()=>{throw Error('FOLLOWUP_OFFLINE: UDP denied');};
const dns=require('node:dns');
for(const target of [dns,dns.promises])for(const name of Object.keys(target))if(/^(resolve|reverse)/.test(name))target[name]=()=>{throw Error('FOLLOWUP_OFFLINE: DNS denied');};
const lookup=dns.lookup;dns.lookup=function(host,...args){if(!['localhost','127.0.0.1','::1'].includes(host))throw Error('FOLLOWUP_OFFLINE: hostname denied');return lookup.call(this,host,...args);};
