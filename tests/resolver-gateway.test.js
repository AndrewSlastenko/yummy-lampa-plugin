const assert = require('node:assert/strict');
const http = require('node:http');
const {createHandler, reloadCertificate} = require('../server/deploy/gateway');
const token='a'.repeat(64);
const listen=server=>new Promise(resolve=>server.listen(0,'127.0.0.1',()=>resolve(server.address().port)));
(async()=>{
 let calls=0;
 const backend=http.createServer((req,res)=>{calls++;if(req.url==='/truncated'){res.writeHead(200,{'Content-Length':100});res.write('partial');setTimeout(()=>res.destroy(),10);return;}res.setHeader('Content-Type','application/json');res.end(JSON.stringify({url:req.url,range:req.headers.range,host:req.headers.host}));});
 const backendPort=await listen(backend);
 const gateway=http.createServer(createHandler({token,upstream:'http://127.0.0.1:'+backendPort,timeoutMs:1000}));
 const port=await listen(gateway),base='http://127.0.0.1:'+port;
 try{
  for(const path of ['/health','/'+token,'/'+token+'bad/health','/'+token+'/../health','/%61'+token.slice(1)+'/health']){
   assert.equal((await fetch(base+path)).status,404,path);
  }
  assert.equal(calls,0,'unauthorized requests must not reach the resolver');
  const response=await fetch(base+'/'+token+'/hls/id/p?u=x&s=y',{headers:{Range:'bytes=10-19'}});
  assert.equal(response.status,200);
  assert.deepEqual(await response.json(),{url:'/hls/id/p?u=x&s=y',range:'bytes=10-19',host:'127.0.0.1:'+backendPort});
  assert.equal((await fetch(base+'/'+token+'/resolve',{method:'POST'})).status,405);
  await assert.rejects(async()=>{const truncated=await fetch(base+'/'+token+'/truncated',{signal:AbortSignal.timeout(500)});await truncated.text();},error=>error.name==='TypeError','an interrupted upstream must close the client immediately');
  assert.throws(()=>createHandler({token:'short',upstream:'http://127.0.0.1:1'}),/token/i);
  let updates=0;
  const tlsServer={setSecureContext(options){assert.equal(options.cert.toString(),'certificate');assert.equal(options.key.toString(),'key');updates++;}};
  const read=name=>Buffer.from(name==='cert'?'certificate':'key');
  reloadCertificate(tlsServer,{certPath:'cert',keyPath:'key',read});
  assert.equal(updates,1);
  assert.throws(()=>reloadCertificate(tlsServer,{certPath:'cert',keyPath:'key',read(){throw new Error('missing certificate');}}),/missing/);
  assert.equal(updates,1,'failed reload must retain the current TLS context');
  await new Promise(r=>backend.close(r));
  assert.equal((await fetch(base+'/'+token+'/health')).status,502,'stopped backend must return a bounded error');
 }finally{await new Promise(r=>gateway.close(r));if(backend.listening)await new Promise(r=>backend.close(r));}
 console.log('resolver gateway tests passed');
})().catch(error=>{console.error(error);process.exitCode=1;});
