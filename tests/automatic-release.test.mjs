import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {authorizeRun,publisherDispatch,assertTagAvailable,ensureTagAndDispatch,verifyPublishedArchive,githubClient} from '../scripts/automatic-release.mjs';

const pkg=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8'));
const repository=pkg.repository.url.replace('git+https://github.com/','').replace(/\.git$/,'');
const sha='a'.repeat(40),other='b'.repeat(40),digest='c'.repeat(64),tag='v0.2.9',filename=repository.split('/')[0].replace(/design$/,'')+'-react-0.2.9.tgz';
const workflow={id:71,path:'.github/workflows/verify.yml',state:'active'};
const event={repository:{full_name:repository},workflow_run:{repository:{full_name:repository},head_repository:{full_name:repository},workflow_id:workflow.id,path:workflow.path,conclusion:'success',event:'push',head_branch:'main',head_sha:sha}};
const authorization={event,workflow,expectedRepository:repository,checkoutSha:sha,remoteMainSha:sha,protectedRef:'true'};

test('only the authoritative successful current-main push can cause automatic publication',()=>{
 assert.equal(authorizeRun(authorization),sha);
 for(const changes of [{event:'pull_request'},{conclusion:'failure'},{head_branch:'develop'},{workflow_id:72},{path:'.github/workflows/other.yml'},{head_sha:other},{head_repository:{full_name:'foreign/react'}},{repository:{full_name:'foreign/react'}}]){
  const changed=structuredClone(event);Object.assign(changed.workflow_run,changes);assert.throws(()=>authorizeRun({...authorization,event:changed}));
 }
 assert.throws(()=>authorizeRun({...authorization,remoteMainSha:other}));
 assert.throws(()=>authorizeRun({...authorization,protectedRef:'false'}));
 assert.throws(()=>authorizeRun({...authorization,workflow:{...workflow,state:'disabled_manually'}}));
 const foreign=structuredClone(event);foreign.repository.full_name='foreign/react';assert.throws(()=>authorizeRun({...authorization,event:foreign}));
});

test('automatic dispatch preserves the existing main workflow-dispatch trusted publisher identity',()=>{
 assert.deepEqual(publisherDispatch({sha,archiveSha256:digest,version:'0.2.9'}),{ref:'main',inputs:{source_sha:sha,artifact_sha256:digest,distribution_tag:'latest',publish_mode:'publish'}});
 assert.equal(publisherDispatch({sha,archiveSha256:digest,version:'0.3.0-rc.1'}).inputs.distribution_tag,'next');
 for(const bad of [{sha:'main'},{archiveSha256:'unknown'},{version:'0.2.09'},{version:'0.2.9\nother'}])assert.throws(()=>publisherDispatch({sha,archiveSha256:digest,version:'0.2.9',...bad}));
});

function fixture({existing=null,annotated=false,race=null,release=null,tagMissingBody='Not Found',releaseMissingBody='Not Found'}={}){
 const calls=[],root='repos/'+repository,tagPath=root+'/git/ref/tags/'+tag;let current=existing;
 const ref=()=>({ref:'refs/tags/'+tag,object:{type:annotated?'tag':'commit',sha:annotated?'d'.repeat(40):current}});
 const api=async(path,options={})=>{calls.push({path,...options});
  if(path===root)return {status:200,data:{full_name:repository}};
  if(path===tagPath)return current?{status:200,data:ref()}:{status:404,data:{message:tagMissingBody}};
  if(path===root+'/git/tags/'+'d'.repeat(40))return {status:200,data:{object:{type:'commit',sha:current}}};
  if(path===root+'/git/refs'){assert.equal(options.method,'POST');assert.deepEqual(options.body,{ref:'refs/tags/'+tag,sha});current=race||sha;return {status:race?422:201,data:{}};}
  if(path===root+'/releases/tags/'+tag)return release?{status:200,data:release}:{status:404,data:{message:releaseMissingBody}};
  if(path===root+'/actions/workflows/tag-release.yml/dispatches'){assert.equal(options.method,'POST');assert.deepEqual(options.body,{ref:tag});return {status:204,data:null};}
  throw Error('Unexpected API call '+path);
 };return {api,calls};
}
const completion={repository,tag,sha,filename,archiveSha256:digest,archiveBytes:120};

test('read-only prepublication tag guard permits only definite absence or the exact peeled commit',async()=>{
 for(const config of [{},{existing:sha},{existing:sha,annotated:true}]){const f=fixture(config);assert.ok(['absent','exact-source'].includes(await assertTagAvailable(f.api,completion)));assert.equal(f.calls.some(call=>call.method),false);}
 for(const config of [{existing:other},{existing:other,annotated:true},{tagMissingBody:'unknown proxy failure'}]){const f=fixture(config);await assert.rejects(assertTagAvailable(f.api,completion));assert.equal(f.calls.some(call=>call.method),false);}
});

test('completion creates only a missing exact-source tag and dispatches the guarded release at that tag',async()=>{
 const f=fixture();assert.deepEqual(await ensureTagAndDispatch(f.api,completion),{state:'source-completion-dispatched',tag,sha});
 assert.equal(f.calls.filter(call=>call.path.endsWith('/git/refs')).length,1);
 assert.equal(f.calls.filter(call=>call.path.endsWith('/tag-release.yml/dispatches')).length,1);
 assert.equal(f.calls.some(call=>['PATCH','PUT','DELETE'].includes(call.method)),false);
});

test('existing exact or annotated tags are reused, while conflicting tags and creation races never overwrite',async()=>{
 for(const config of [{existing:sha},{existing:sha,annotated:true},{race:sha}]){const f=fixture(config);await ensureTagAndDispatch(f.api,completion);assert.equal(f.calls.some(call=>['PATCH','PUT','DELETE'].includes(call.method)),false);}
 for(const config of [{existing:other},{existing:other,annotated:true},{race:other}]){const f=fixture(config);await assert.rejects(ensureTagAndDispatch(f.api,completion));assert.equal(f.calls.some(call=>call.path.endsWith('/dispatches')),false);assert.equal(f.calls.some(call=>['PATCH','PUT','DELETE'].includes(call.method)),false);}
});

test('existing source releases skip only matching tag/assets and are never rewritten',async()=>{
 const release={tag_name:tag,draft:false,assets:[{name:filename,digest:'sha256:'+digest,size:120},{name:'SHA256SUMS',size:110}]};
 const f=fixture({existing:sha,release});assert.equal((await ensureTagAndDispatch(f.api,completion)).state,'already-complete');assert.equal(f.calls.some(call=>call.method),false);
 for(const changed of [{...release,draft:true},{...release,tag_name:'v0.2.8'},{...release,assets:[{name:filename,digest:'sha256:'+'0'.repeat(64),size:120},{name:'SHA256SUMS',size:110}]}]){const bad=fixture({existing:sha,release:changed});await assert.rejects(ensureTagAndDispatch(bad.api,completion));assert.equal(bad.calls.some(call=>call.method),false);}
 const unknown=fixture({existing:sha,releaseMissingBody:'access failure'});await assert.rejects(ensureTagAndDispatch(unknown.api,completion));assert.equal(unknown.calls.some(call=>call.path.endsWith('/dispatches')),false);
});

test('completed publication requires the exact approved bytes and registry SHA512 identity before tag writes',()=>{
 const bytes=Buffer.from('reviewed isolated archive'),metadata={name:pkg.name,version:'0.2.9',dist:{integrity:'sha512-'+createHash('sha512').update(bytes).digest('base64')}},expectedSha256=createHash('sha256').update(bytes).digest('hex');
 verifyPublishedArchive({bytes,metadata,name:pkg.name,version:'0.2.9',expectedSha256});
 for(const changed of [{bytes:Buffer.from('corrupted')},{metadata:{...metadata,name:'@foreign/react'}},{metadata:{...metadata,version:'0.2.8'}},{metadata:{...metadata,dist:{integrity:'sha512-'+Buffer.alloc(64).toString('base64')}}},{expectedSha256:'0'.repeat(64)}])assert.throws(()=>verifyPublishedArchive({bytes,metadata,name:pkg.name,version:'0.2.9',expectedSha256,...changed}));
});

test('GitHub API ambiguity and redirects fail closed and never become missing tags/releases',async()=>{
 for(const status of [301,401,403,429,500]){
  const api=githubClient('unit-token',async()=>({status,text:async()=>JSON.stringify({message:'Not Found'})}));
  await assert.rejects(api('repos/'+repository+'/git/ref/tags/'+tag,{expected:[200,404]}));
 }
 assert.throws(()=>githubClient(''));
});

test('the single required fast job and full browser assertions remain separate from publication authority',async()=>{
 const read=name=>readFile(new URL('../.github/workflows/'+name,import.meta.url),'utf8');
 const [verify,browser,automatic,publisher,release]=await Promise.all(['verify.yml','browser-advisory.yml','automatic-release.yml','stage-release.yml','tag-release.yml'].map(read));
 assert.match(verify,/name: Verify standalone package/);assert.match(verify,/  test:/);assert.doesNotMatch(verify,/  browser:/);
 assert.match(browser,/browser: \[chromium, firefox, webkit\]/);assert.match(browser,/max-parallel: 2/);assert.match(browser,/npm run test:browser/);assert.match(browser,/timeout-minutes: 4/);
 assert.match(automatic,/workflow_run:/);assert.match(automatic,/ref: \$\{\{ github.event.workflow_run.head_sha \}\}/);assert.doesNotMatch(automatic,/npm (?:publish|stage publish)|id-token:/);
 assert.match(publisher,/options: \[stage, publish\]\n        default: stage/);assert.match(publisher,/environment: react-production-release/);assert.match(publisher,/npm publish .*--provenance/);assert.match(publisher,/npm stage publish .*--provenance/);
 assert.ok(publisher.indexOf('automatic-release.mjs tag-available')<publisher.indexOf('npm publish '));
 assert.match(release,/workflow_dispatch:/);assert.match(release,/tags: \['v\*'\]/);assert.doesNotMatch(release,/npm publish|id-token:/);
 assert.match(release,/verify-registry/);assert.match(release,/verify-provenance/);
});

// Workflow-level concurrency is evaluated before job-level event guards.
// A main→develop PR has head_branch=main but must not cancel its main push.
test('skipped PR completion cannot cancel a genuine main publisher watcher',async()=>{
 const workflow=await readFile(new URL('../.github/workflows/automatic-release.yml',import.meta.url),'utf8');
 const template=workflow.match(/^  group: (.+)$/m)?.[1];assert.ok(template);
 const group=(event,branch='main',conclusion='success')=>template.replace(/\$\{\{ github.repository \}\}/g,repository).replace(/\$\{\{ github.event.workflow_run.event \}\}/g,event).replace(/\$\{\{ github.event.workflow_run.head_branch \}\}/g,branch).replace(/\$\{\{ github.event.workflow_run.conclusion \}\}/g,conclusion);
 assert.notEqual(group('push'),group('pull_request'));
 assert.notEqual(group('push','main'),group('push','develop'));
 assert.notEqual(group('push'),group('push','main','cancelled'));
 assert.notEqual(group('push'),group('push','main','failure'));
 assert.doesNotMatch(group('push'),/\$\{\{/);
 assert.equal(group('push'),group('push'));
 assert.doesNotMatch(template,/head_sha|run_id|run_number/);
 assert.match(workflow,/cancel-in-progress: true/);
});
