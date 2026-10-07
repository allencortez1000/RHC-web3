const test=require('node:test'),assert=require('node:assert/strict'),http=require('node:http'),net=require('node:net');
const path=require('node:path');
const {worktree}=require('./run.cjs');
const request=require(path.join(worktree,'node_modules/supertest'));
test('supertest may connect only to its own ephemeral server',async()=>{
 const server=http.createServer((req,res)=>res.end('owned fixture'));
 try{await request(server).get('/').expect(200,'owned fixture');}finally{server.close();}
});
test('unowned loopback and external sockets remain denied',()=>{
 for(const options of [{host:'127.0.0.1',port:1},{host:'127.0.0.1',port:5432},{host:'example.com',port:443}]){
  const s=new net.Socket();try{assert.throws(()=>s.connect(options),/FOLLOWUP_OFFLINE/);}finally{s.destroy();}
 }
});
