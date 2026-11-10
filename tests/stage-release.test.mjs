import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {validateStage,verifyStagedProvenance} from '../scripts/stage-release-guard.mjs';
import {pkg,lock,pin,developmentPkg,developmentLock} from './fixtures/release-source.mjs';
const sha='a'.repeat(40),repository=pkg.repository.url.replace('git+https://github.com/','').replace('.git','');
const good={pkg,lock,pin,repository,expectedRepository:repository,ref:'refs/heads/main',protectedRef:'true',sourceSha:sha,eventSha:sha,checkoutSha:sha,remoteMainSha:sha};
test('checked-in registry dependencies satisfy the publication guard',()=>{
 assert.equal(validateStage({...good,pkg:developmentPkg,lock:developmentLock}).version,developmentPkg.version);
});
test('staging rejects unprotected, stale or substituted source authority',()=>{
 assert.equal(validateStage(good).name,pkg.name);
 for(const changes of [{ref:'refs/heads/develop'},{protectedRef:'false'},{eventSha:'b'.repeat(40)},{remoteMainSha:'b'.repeat(40)},{repository:'untrusted/repo'}])assert.throws(()=>validateStage({...good,...changes}));
});
test('staging rejects fixture dependency locks and mismatched registry identity',()=>{
 const changed=structuredClone(lock);changed.packages['node_modules/'+pin.core.name].resolved='file:../fixture.tgz';
 assert.throws(()=>validateStage({...good,lock:changed}));
 assert.throws(()=>validateStage({...good,pin:{...pin,core:{...pin.core,integrity:'wrong'}}}));
});

test('staged provenance requires the exact staging workflow, main ref, dispatch event and reviewed source',()=>{
 const archive=Buffer.from('synthetic already-verified npm audit input'),name=pkg.name,version=pkg.version,commit='a'.repeat(40),ref='refs/heads/main';
 const statement={_type:'https://in-toto.io/Statement/v1',predicateType:'https://slsa.dev/provenance/v1',subject:[{name:`pkg:npm/${encodeURIComponent(name.split('/')[0])}/react@${version}`,digest:{sha512:createHash('sha512').update(archive).digest('hex')}}],predicate:{buildDefinition:{buildType:'https://slsa-framework.github.io/github-actions-buildtypes/workflow/v1',externalParameters:{workflow:{repository:'https://github.com/'+repository,path:'.github/workflows/stage-release.yml',ref}},internalParameters:{github:{event_name:'workflow_dispatch'}},resolvedDependencies:[{uri:'git+https://github.com/'+repository+'@'+ref,digest:{gitCommit:commit}}]},runDetails:{builder:{id:'https://github.com/actions/runner/github-hosted'}}}};
 const auditFor=x=>({invalid:[],missing:[],verified:[{name,version,attestationBundles:[{predicateType:'https://slsa.dev/provenance/v1',bundle:{dsseEnvelope:{payload:Buffer.from(JSON.stringify(x)).toString('base64')}}}]}]});
 const good={archive,name,version,repository,commit,audit:auditFor(statement)};
 assert.equal(verifyStagedProvenance(good),true);
 assert.equal(verifyStagedProvenance({...good,commit:'b'.repeat(40)}),false);
 for(const [key,value] of [['path','.github/workflows/tag-release.yml'],['ref','refs/tags/v'+version]]){const changed=structuredClone(statement);changed.predicate.buildDefinition.externalParameters.workflow[key]=value;assert.equal(verifyStagedProvenance({...good,audit:auditFor(changed)}),false);}
 const changed=structuredClone(statement);changed.predicate.buildDefinition.internalParameters.github.event_name='push';assert.equal(verifyStagedProvenance({...good,audit:auditFor(changed)}),false);
 assert.equal(verifyStagedProvenance({...good,archive:Buffer.from('corrupt')}),false);
});
