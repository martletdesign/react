// Read-only adoption verification. Deployment/rollback operations remain coordinated.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {digest,verifyLocal,verifyAcceptedRef,verifyReferenceIdentity} from './reference-artifact.mjs';

const [directory,origin,branch,receipt]=process.argv.slice(2),root=resolve(directory??'.');
const base=new URL(origin);
assert(base.protocol==='https:'&&base.pathname==='/'&&!base.username&&!base.password&&!base.search&&!base.hash,'Use an HTTPS site origin');
const bytes=await readFile(join(root,'artifact.json')),artifact=JSON.parse(bytes),version=await verifyLocal(root,artifact);
const [pkg,pin]=await Promise.all(['../package.json','../docs-release-lock.json'].map(path=>readFile(new URL(path,import.meta.url),'utf8').then(JSON.parse)));
verifyReferenceIdentity({artifact,version,pkg,pin});
const remote=()=>execFileSync('git',['ls-remote','--refs','https://github.com/'+artifact.source.repository+'.git','refs/heads/'+branch],{encoding:'utf8',timeout:20000});
verifyAcceptedRef({branch,commit:artifact.source.commit,advertisement:remote()});
const deadline=AbortSignal.timeout(240000);
const read=async(path,size)=>{
 const publicPath=path.endsWith('index.html')?path.slice(0,-10):path;
 const response=await fetch(new URL(publicPath,base),{redirect:'error',signal:AbortSignal.any([deadline,AbortSignal.timeout(20000)]),headers:{'cache-control':'no-cache'}});
 assert.equal(response.status,200,'Public file unavailable: '+path);
 const chunks=[];let length=0;
 for await(const value of response.body){length+=value.length;assert(length<=size,'Public file exceeds expected size: '+path);chunks.push(value);}
 assert.equal(length,size,'Public file size differs: '+path);return Buffer.concat(chunks);
};
assert.deepEqual(await read('artifact.json',bytes.length),bytes,'Live artifact manifest differs');
let next=0,verified=0;
await Promise.all(Array.from({length:8},async()=>{for(;;){const entry=artifact.files[next++];if(!entry)return;const payload=await read(entry.path,entry.size);assert.equal(digest(payload),entry.sha256,'Live integrity mismatch: '+entry.path);verified++;}}));
verifyAcceptedRef({branch,commit:artifact.source.commit,advertisement:remote()});
assert.deepEqual(await read('artifact.json',bytes.length),bytes,'Live deployment changed during verification');
const result={status:'passed',origin:base.href,branch,source:artifact.source,package:version.package,core:version.core,artifactSha256:digest(bytes),verifiedFiles:verified,checkedAt:new Date().toISOString()};
if(receipt)await writeFile(receipt,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));
