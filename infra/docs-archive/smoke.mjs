import {Miniflare} from 'miniflare';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const mf=new Miniflare({modules:true,scriptPath:fileURLToPath(new URL('./worker.mjs',import.meta.url)),compatibilityDate:'2026-08-06',r2Buckets:['ARCHIVES'],bindings:{FAMILY:'martlet',ARCHIVE_WRITE_TOKEN:'this-is-a-secret-token-32-bytes-minimum',DEPLOY_PREFIX:'/preview'}});
const call=(path,method='GET',body,extra={})=>mf.dispatchFetch('https://example.invalid/preview'+path,{method,body,redirect:'manual',headers:{authorization:'Bearer this-is-a-secret-token-32-bytes-minimum',...extra}});
const sha=b=>createHash('sha256').update(b).digest('hex');
try{
 const bytes=Buffer.from('<h1>archive</h1>');const v='2.0.0';const manifest=Buffer.from(JSON.stringify({schemaVersion:1,family:'martlet',framework:'react',docsVersion:v,basePath:`/docs/v/${v}/`,implementation:{kind:'npm',name:'@martlet/react',version:v,tag:`v${v}`},source:{repository:'martletdesign/react',commit:'a'.repeat(40),tag:`v${v}`},core:{name:'@martlet/core',version:'2.2.3',integrity:`sha512-${Buffer.alloc(64,1).toString('base64')}`},indexing:'noindex',files:[{path:'index.html',size:bytes.length,sha256:sha(bytes)}]}));
 assert.equal((await call('/_archive/v/2.0.0/index.html','PUT',bytes)).status,201);
 assert.equal((await call('/_archive/v/2.0.0/index.html','PUT',bytes)).status,409);
 assert.equal((await call('/_archive/v/2.0.0/manifest.json','PUT',manifest,{'x-manifest-sha256':sha(manifest)})).status,201);
 assert.equal(await (await call('/docs/v/2.0.0/')).text(),bytes.toString());
 const catalog={schemaVersion:1,family:'martlet',framework:'react',previousSha256:null,latestStable:v,versions:[{version:v,channel:'stable',manifestSha256:sha(manifest),supported:true,topics:['index.html']}]};
 const first=Buffer.from(JSON.stringify(catalog));assert.equal((await call('/_archive/catalog','PUT',first,{'x-previous-catalog-sha256':'none'})).status,201);
 const second=Buffer.from(JSON.stringify({...catalog,previousSha256:sha(first)}));assert.equal((await call('/_archive/catalog','PUT',second,{'x-previous-catalog-sha256':sha(first)})).status,201);
 assert.equal(sha(Buffer.from(await (await call('/docs/catalog.json')).arrayBuffer())),sha(second));
 assert.equal((await call('/_archive/catalog','PUT',first,{'x-previous-catalog-sha256':'none'})).status,409);
 const promotion=Buffer.from(JSON.stringify({schemaVersion:1,family:'martlet',framework:'react',previousSha256:null,catalogSha256:sha(second),version:v,operation:'promote',reason:''}));
 assert.equal((await call('/_archive/promotion','PUT',promotion,{'x-previous-promotion-sha256':'none'})).status,201);
 assert.equal((await call('/docs/')).headers.get('location'),'/preview/docs/v/2.0.0/');
 console.log('Miniflare R2 create-only archive, conditional catalog and promotion pointers, history and /preview passed');
}finally{await mf.dispose();}
