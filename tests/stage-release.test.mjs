import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validateStage} from '../scripts/stage-release-guard.mjs';
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8').then(JSON.parse);
const [pkg,lock,pin,delivery]=await Promise.all(['package.json','package-lock.json','docs-release-lock.json','docs-delivery.json'].map(read));
const sha='a'.repeat(40),repository=pkg.repository.url.replace('git+https://github.com/','').replace('.git','');
const good={pkg,lock,pin,delivery,repository,expectedRepository:repository,ref:'refs/heads/main',protectedRef:'true',sourceSha:sha,eventSha:sha,checkoutSha:sha,remoteMainSha:sha};
test('staging rejects unprotected, stale or substituted source authority',()=>{
 assert.equal(validateStage(good).name,pkg.name);
 for(const changes of [{ref:'refs/heads/develop'},{protectedRef:'false'},{eventSha:'b'.repeat(40)},{remoteMainSha:'b'.repeat(40)},{repository:'untrusted/repo'}])assert.throws(()=>validateStage({...good,...changes}));
});
test('staging rejects fixture dependency locks and an unverified advanced archive switch',()=>{
 const changed=structuredClone(lock);changed.packages['node_modules/'+pin.core.name].resolved='file:../fixture.tgz';
 assert.throws(()=>validateStage({...good,lock:changed}));
 assert.throws(()=>validateStage({...good,delivery:{...delivery,advancedArchive:{enabled:true,administratorImmutable:false}}}));
 assert.throws(()=>validateStage({...good,pin:{...pin,core:{...pin.core,integrity:'wrong'}}}));
});
