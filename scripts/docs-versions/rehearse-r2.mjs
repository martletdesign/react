// Nonpublishing integration: pass the actual generated reference archive through
// the same client and gateway code using an isolated, in-memory R2 substitute.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {timingSafeEqual} from 'node:crypto';
import {join} from 'node:path';
import worker from '../../infra/docs-archive/worker.mjs';
import {publishCandidate,verifyPublished} from '../../infra/docs-archive/client.mjs';
import {sha256} from './contract.mjs';
crypto.subtle.timingSafeEqual=(a,b)=>timingSafeEqual(Buffer.from(a),Buffer.from(b));
const {DOCS_ARCHIVE_ROOT, DOCS_VERSION, DOCS_DEPLOY_PREFIX='',DOCS_FAMILY}=process.env;
if(!DOCS_ARCHIVE_ROOT||!DOCS_VERSION||!['martlet','krigsvold'].includes(DOCS_FAMILY))throw Error('Missing rehearsal inputs');
const bytes=await readFile(join(DOCS_ARCHIVE_ROOT,DOCS_VERSION,'manifest.json')),manifest=JSON.parse(bytes),expectedSha256=sha256(bytes);
const pin=JSON.parse(await readFile('docs-release-lock.json','utf8'));assert.equal(manifest.framework,'react');assert.deepEqual(manifest.core,pin.core);assert.equal(manifest.family,DOCS_FAMILY);assert.ok(manifest.files.filter(f=>f.path.endsWith('.html')).length>=50,'Full reference must include at least 50 HTML pages');
const data=new Map(),bucket={async head(k){return data.has(k)?{}:null;},async get(k){const b=data.get(k);return b?{body:true,etag:sha256(b),arrayBuffer:async()=>Uint8Array.from(b).buffer}:null;},async put(k,v,opt){const none=opt.onlyIf.get('if-none-match'),match=opt.onlyIf.get('if-match');if(none==='*'&&data.has(k))return null;if(match&&(!data.has(k)||match!==`"${sha256(data.get(k))}"`))return null;if(!none&&!match)throw Error('unconditional write');data.set(k,Uint8Array.from(v));return {};}};
const token='disposable-local-rehearsal-token-only',env={FAMILY:DOCS_FAMILY,DEPLOY_PREFIX:DOCS_DEPLOY_PREFIX,ARCHIVES:bucket,ARCHIVE_WRITE_TOKEN:token},originalFetch=globalThis.fetch;
globalThis.fetch=async(url,opts)=>worker.fetch(new Request(url,opts),env);
try{
 const opts={base:`https://archive.invalid${DOCS_DEPLOY_PREFIX}`,token,archiveRoot:DOCS_ARCHIVE_ROOT,version:DOCS_VERSION,expectedSha256};
 await publishCandidate(opts);const result=await verifyPublished(opts);assert.equal(result.files,manifest.files.length);
 const page=manifest.files.find(f=>f.path.startsWith('examples/')&&f.path.endsWith('/index.html'));assert.ok(page);
 const response=await worker.fetch(new Request(`${opts.base}/docs/v/${DOCS_VERSION}/${page.path}`),env);assert.equal(response.status,200);
 assert.equal(sha256(Buffer.from(await response.arrayBuffer())),page.sha256);
 console.log(JSON.stringify({family:DOCS_FAMILY,version:DOCS_VERSION,prefix:DOCS_DEPLOY_PREFIX,files:result.files,html:manifest.files.filter(f=>f.path.endsWith('.html')).length,manifestSha256:expectedSha256,storage:'in-memory R2 substitute'}));
}finally{globalThis.fetch=originalFetch;}
