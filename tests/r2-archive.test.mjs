import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash,timingSafeEqual} from 'node:crypto';
import worker from '../infra/docs-archive/worker.mjs';
// Cloudflare supplies this extension; Node does not.
crypto.subtle.timingSafeEqual = (a,b)=>timingSafeEqual(Buffer.from(a),Buffer.from(b));
class MockR2 {
  data=new Map();
  async head(key){return this.data.has(key)?{}:null;}
  async get(key){const b=this.data.get(key);return b?{body:true,etag:sha(b),arrayBuffer:async()=>Uint8Array.from(b).buffer}:null;}
  async put(key,value,options){const none=options.onlyIf.get('if-none-match'),match=options.onlyIf.get('if-match');if(none==='*'&&this.data.has(key))return null;if(match&&(!this.data.has(key)||match!==`"${sha(this.data.get(key))}"`))return null;if(!none&&!match)throw Error('unconditional write');this.data.set(key,Uint8Array.from(value));return {};}
}
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const token='this-is-a-secret-token-32-bytes-minimum';
const env=()=>({FAMILY:'martlet',ARCHIVES:new MockR2(),ARCHIVE_WRITE_TOKEN:token});
const send=(env,path,{method='GET',body,auth=true,headers={}}={})=>worker.fetch(new Request('https://example.invalid'+path,{method,body,headers:{...(auth?{authorization:`Bearer ${token}`}:{}) ,...headers}}),env);
function manifestFor(version,bytes) {return {schemaVersion:1,family:'martlet',framework:'react',docsVersion:version,basePath:`/docs/v/${version}/`,implementation:{kind:'npm',name:'@martlet/react',version,tag:`v${version}`},core:{name:'@martlet/core',version:'2.2.3',integrity:`sha512-${Buffer.alloc(64,1).toString('base64')}`},source:{repository:'martletdesign/react',commit:'a'.repeat(40),tag:`v${version}`},indexing:'noindex',files:[{path:'index.html',size:bytes.length,sha256:sha(bytes)}]};}
async function upload(env,version,bytes){const root=`/_archive/v/${version}/`,manifest=Buffer.from(JSON.stringify(manifestFor(version,bytes)));assert.equal((await send(env,root+'index.html',{method:'PUT',body:bytes})).status,201);assert.equal((await send(env,root+'manifest.json',{method:'PUT',body:manifest,headers:{'x-manifest-sha256':sha(manifest)}})).status,201);return manifest;}
test('conditional creation, complete manifest and independently retrievable bytes',async()=>{
 const e=env(),first=Buffer.from('<h1>first</h1>'),m=await upload(e,'2.0.0',first);
 assert.equal((await send(e,'/docs/v/2.0.0/')).status,200);assert.equal(await (await send(e,'/docs/v/2.0.0/')).text(),first.toString());
 assert.equal(sha(Buffer.from(await (await send(e,'/docs/v/2.0.0/manifest.json')).arrayBuffer())),sha(m));
 assert.equal((await send(e,'/_archive/v/2.0.0/index.html',{method:'PUT',body:'changed'})).status,409);
 await upload(e,'2.1.0',Buffer.from('<h1>second</h1>'));assert.equal(await (await send(e,'/docs/v/2.0.0/')).text(),first.toString());
 assert.equal((await send(e,'/docs/v/2.0.0/unknown.js')).status,404);
});
test('rejects unauthorized writes, incomplete commits, replacement and corrupted objects',async()=>{
 const e=env(),b=Buffer.from('expected'),m=Buffer.from(JSON.stringify(manifestFor('2.0.0',b))),root='/_archive/v/2.0.0/';
 assert.equal((await send(e,root+'index.html',{method:'PUT',body:b,auth:false})).status,401);
 assert.equal((await send(e,root+'manifest.json',{method:'PUT',body:m,headers:{'x-manifest-sha256':sha(m)}})).status,409);
 assert.equal((await send(e,root+'index.html',{method:'PUT',body:b})).status,201);
 assert.equal((await send(e,root+'index.html',{method:'PUT',body:'evil'})).status,409);
 assert.equal((await send(e,root+'manifest.json',{method:'PUT',body:m,headers:{'x-manifest-sha256':'f'.repeat(64)}})).status,400);
 assert.equal((await send(e,root+'manifest.json',{method:'PUT',body:m,headers:{'x-manifest-sha256':sha(m)}})).status,201);
 e.ARCHIVES.data.set('martlet/react/2.0.0/index.html',Buffer.from('tampered'));
 assert.equal((await send(e,'/docs/v/2.0.0/')).status,503);
});
test('rejects unsafe identities and upload paths',async()=>{
 const e=env();assert.equal((await send(e,'/_archive/v/01.0.0/index.html',{method:'PUT',body:'x'})).status,404);
 assert.equal((await send(e,'/_archive/v/2.0.0/%2fetc',{method:'PUT',body:'x'})).status,400);
 const wrong=manifestFor('2.0.0',Buffer.from('a'));wrong.family='krigsvold';const m=Buffer.from(JSON.stringify(wrong));
 assert.equal((await send(e,'/_archive/v/2.0.0/manifest.json',{method:'PUT',body:m,headers:{'x-manifest-sha256':sha(m)}})).status,400);
});

test('catalog history is append-only and competing pointer advances cannot both win',async()=>{
 const e=env(),v='2.0.0',bytes=Buffer.from('one'),manifest=await upload(e,v,bytes),entry={version:v,channel:'stable',manifestSha256:sha(manifest),supported:true,topics:['index.html']};
 const first={schemaVersion:1,family:'martlet',framework:'react',previousSha256:null,latestStable:v,versions:[entry]};
 const a=Buffer.from(JSON.stringify(first));assert.equal((await send(e,'/_archive/catalog',{method:'PUT',body:a,headers:{'x-previous-catalog-sha256':'none'}})).status,201);
 const altered={...first,previousSha256:sha(a),versions:[{...entry,manifestSha256:'f'.repeat(64)}]};
 assert.equal((await send(e,'/_archive/catalog',{method:'PUT',body:JSON.stringify(altered),headers:{'x-previous-catalog-sha256':sha(a)}})).status,409);
 const successor={...first,previousSha256:sha(a)};
 const advance=value=>send(e,'/_archive/catalog',{method:'PUT',body:JSON.stringify({...successor,description:value}),headers:{'x-previous-catalog-sha256':sha(a)}});
 const results=await Promise.all([advance('one'),advance('two')]);assert.deepEqual(results.map(x=>x.status).sort(),[201,409]);
 assert.equal((await send(e,`/docs/catalog-history/${sha(a)}.json`)).status,200);
});

test('subpath routes serve only the configured prefix',async()=>{
 const e=env();e.DEPLOY_PREFIX='/preview';const b=Buffer.from('x'),m=Buffer.from(JSON.stringify(manifestFor('2.0.0',b)));
 assert.equal((await send(e,'/_archive/v/2.0.0/index.html',{method:'PUT',body:b})).status,404);
 assert.equal((await send(e,'/preview/_archive/v/2.0.0/index.html',{method:'PUT',body:b})).status,201);
 assert.equal((await send(e,'/preview/_archive/v/2.0.0/manifest.json',{method:'PUT',body:m,headers:{'x-manifest-sha256':sha(m)}})).status,201);
 assert.equal(await (await send(e,'/preview/docs/v/2.0.0/')).text(),'x');
 assert.equal((await send(e,'/docs/v/2.0.0/')).status,404);
});

test('promotion and explicit withdrawal rollback retain archives and promotion history',async()=>{
 const e=env(),m1=await upload(e,'2.0.0',Buffer.from('old')),m2=await upload(e,'2.1.0',Buffer.from('new'));
 const entry=(v,m)=>({version:v,channel:'stable',manifestSha256:sha(m),supported:true,topics:['index.html']});
 const first={schemaVersion:1,family:'martlet',framework:'react',previousSha256:null,latestStable:'2.1.0',versions:[entry('2.0.0',m1),entry('2.1.0',m2)]},catalog=Buffer.from(JSON.stringify(first));
 assert.equal((await send(e,'/_archive/catalog',{method:'PUT',body:catalog,headers:{'x-previous-catalog-sha256':'none'}})).status,201);
 const release={schemaVersion:1,family:'martlet',framework:'react',previousSha256:null,catalogSha256:sha(catalog),version:'2.1.0',operation:'promote',reason:''},r=Buffer.from(JSON.stringify(release));
 assert.equal((await send(e,'/_archive/promotion',{method:'PUT',body:r,headers:{'x-previous-promotion-sha256':'none'}})).status,201);
 assert.equal((await send(e,'/docs/')).headers.get('location'),'/docs/v/2.1.0/');
 const withdrawn={...first,previousSha256:sha(catalog),latestStable:'2.0.0',versions:[first.versions[0],{...first.versions[1],supported:false}]},w=Buffer.from(JSON.stringify(withdrawn));
 assert.equal((await send(e,'/_archive/catalog',{method:'PUT',body:w,headers:{'x-previous-catalog-sha256':sha(catalog)}})).status,201);
 assert.equal((await send(e,'/docs/')).status,503);
 const rollback={...release,previousSha256:sha(r),catalogSha256:sha(w),version:'2.0.0',operation:'rollback',reason:'Withdraw broken release'},rb=Buffer.from(JSON.stringify(rollback));
 assert.equal((await send(e,'/_archive/promotion',{method:'PUT',body:rb,headers:{'x-previous-promotion-sha256':sha(r)}})).status,201);
 assert.equal((await send(e,'/docs/')).headers.get('location'),'/docs/v/2.0.0/');
 assert.equal((await send(e,`/docs/promotion-history/${sha(r)}.json`)).status,200);
 assert.equal(await (await send(e,'/docs/v/2.1.0/')).text(),'new');
 assert.equal((await send(e,'/_archive/promotion',{method:'PUT',body:r,headers:{'x-previous-promotion-sha256':'none'}})).status,409);
});

test('the supported current version remains live between catalog advance and promotion',async()=>{
 const e=env(),m1=await upload(e,'2.0.0',Buffer.from('old')),m2=await upload(e,'2.1.0',Buffer.from('new'));
 const entry=(v,m)=>({version:v,channel:'stable',manifestSha256:sha(m),supported:true,topics:['index.html']});
 const c={schemaVersion:1,family:'martlet',framework:'react',previousSha256:null,latestStable:'2.0.0',versions:[entry('2.0.0',m1)]},a=Buffer.from(JSON.stringify(c));
 assert.equal((await send(e,'/_archive/catalog',{method:'PUT',body:a,headers:{'x-previous-catalog-sha256':'none'}})).status,201);
 const p=Buffer.from(JSON.stringify({schemaVersion:1,family:'martlet',framework:'react',previousSha256:null,catalogSha256:sha(a),version:'2.0.0',operation:'promote',reason:''}));
 assert.equal((await send(e,'/_archive/promotion',{method:'PUT',body:p,headers:{'x-previous-promotion-sha256':'none'}})).status,201);
 const next=Buffer.from(JSON.stringify({...c,previousSha256:sha(a),latestStable:'2.1.0',versions:[...c.versions,entry('2.1.0',m2)]}));
 assert.equal((await send(e,'/_archive/catalog',{method:'PUT',body:next,headers:{'x-previous-catalog-sha256':sha(a)}})).status,201);
 assert.equal((await send(e,'/docs/')).headers.get('location'),'/docs/v/2.0.0/');
});

test('client resumes interrupted upload, verifies remote bytes, and rejects a substituted trust anchor',async()=>{
 const {mkdtemp,mkdir,writeFile,rm}=await import('node:fs/promises'),{tmpdir}=await import('node:os'),{join}=await import('node:path');
 const {createManifest,sha256}=await import('../scripts/docs-versions/contract.mjs'),{publishCandidate,verifyPublished,advanceCatalog,verifyCatalogHistory,advancePromotion}=await import('../infra/docs-archive/client.mjs');
 const root=await mkdtemp(join(tmpdir(),'remote-archive-')),e=env(),version='2.0.0',dir=join(root,version),originalFetch=globalThis.fetch;
 try{
  await mkdir(dir);await writeFile(join(dir,'index.html'),'<meta name="robots" content="noindex"><h1>One</h1>');await writeFile(join(dir,'app.js'),'console.log(1)');
  const base=manifestFor(version,Buffer.from(''));
  delete base.files;Object.assign(base,{fixtures:{source:'repository'},toolchain:{node:'24.19.0',vite:'8.3.5'},createdAt:'2026-11-01T00:00:00.000Z'});
  const m=await createManifest(dir,base),bytes=Buffer.from(JSON.stringify(m,null,2)+'\n');await writeFile(join(dir,'manifest.json'),bytes);const expectedSha256=sha256(bytes);
  let failed=false;globalThis.fetch=async(url,opts)=>{if(!failed && String(url).endsWith('/index.html') && opts?.method==='PUT'){failed=true;throw Error('simulated interruption');}return worker.fetch(new Request(url,opts),e);};
  const options={base:'https://example.invalid',token,archiveRoot:root,version,expectedSha256};
  await assert.rejects(publishCandidate(options),/simulated interruption/);
  await publishCandidate(options);await publishCandidate(options);
  assert.equal((await verifyPublished(options)).files,2);
  const entry={version,channel:'stable',manifestSha256:expectedSha256,supported:true,topics:['index.html']};
  const genesis={schemaVersion:1,family:'martlet',framework:'react',previousSha256:null,latestStable:version,versions:[entry]};
  const first=await advanceCatalog({...options,catalog:genesis,expectedPreviousSha256:null});
  assert.equal((await advanceCatalog({...options,catalog:genesis,expectedPreviousSha256:null})).recovered,true);
  const next={...genesis,previousSha256:first.headSha256};
  const second=await advanceCatalog({...options,catalog:next,expectedPreviousSha256:first.headSha256});
  assert.equal((await verifyCatalogHistory({...options,anchorSha256:first.headSha256})).headSha256,second.headSha256);
  const promotion={schemaVersion:1,family:'martlet',framework:'react',previousSha256:null,catalogSha256:second.headSha256,version,operation:'promote',reason:''};
  const promoted=await advancePromotion({...options,promotion,expectedPreviousSha256:null,expectedCatalogSha256:second.headSha256});
  assert.equal((await advancePromotion({...options,promotion,expectedPreviousSha256:null,expectedCatalogSha256:second.headSha256})).recovered,true);
  assert.match(promoted.headSha256,/^[a-f0-9]{64}$/);
  await assert.rejects(verifyCatalogHistory({...options,anchorSha256:'a'.repeat(64)}),/trusted anchor/);
  await assert.rejects(advanceCatalog({...options,catalog:genesis,expectedPreviousSha256:null}),/already exists/);
  await assert.rejects(verifyPublished({...options,expectedSha256:'f'.repeat(64)}),/digest mismatch/);
  e.ARCHIVES.data.set('martlet/react/2.0.0/app.js',Buffer.from('tampered'));
  await assert.rejects(verifyPublished(options),/Missing archive file/);
 }finally{globalThis.fetch=originalFetch;await rm(root,{recursive:true,force:true});}
});
