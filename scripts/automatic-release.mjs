import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {appendFile,readFile,lstat} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {validateStage} from './stage-release-guard.mjs';
import {identityFromFiles,registryState,releaseVersion,verifyArchive} from './tag-release-guard.mjs';

const repository='martletdesign/react';
const registry='https://registry.npmjs.org/';
const shaPattern=/^[a-f0-9]{40}$/;
const digestPattern=/^[a-f0-9]{64}$/;
const git=args=>execFileSync('git',args,{encoding:'utf8',timeout:30000,stdio:['ignore','pipe','pipe']}).trim();
const fetchTimed=(url,options={})=>fetch(url,{...options,redirect:'error',signal:AbortSignal.timeout(15000)});

export function verifyPublishedArchive({bytes,metadata,name,version,expectedSha256}) {
 assert(Buffer.isBuffer(bytes)&&digestPattern.test(expectedSha256??''),'Invalid completed archive evidence');
 assert(createHash('sha256').update(bytes).digest('hex')===expectedSha256&&verifyArchive({local:bytes,remote:bytes,metadata,name,version}),'Published registry bytes differ from the approved archive');
}

export function authorizeRun({event,workflow,expectedRepository,checkoutSha,remoteMainSha,protectedRef}) {
 const run=event?.workflow_run;
 assert(event?.repository?.full_name===expectedRepository&&run?.repository?.full_name===expectedRepository&&run?.head_repository?.full_name===expectedRepository,'Foreign workflow repository');
 assert(run.event==='push'&&run.conclusion==='success'&&run.head_branch==='main','Only a successful accepted main push may publish');
 assert(workflow?.path==='.github/workflows/verify.yml'&&workflow.state==='active'&&Number.isSafeInteger(workflow.id)&&run.workflow_id===workflow.id&&run.path===workflow.path,'Unexpected acceptance workflow identity');
 assert(protectedRef==='true'&&[run.head_sha,checkoutSha,remoteMainSha].every(value=>shaPattern.test(value??''))&&new Set([run.head_sha,checkoutSha,remoteMainSha]).size===1,'Superseded or unprotected accepted source');
 return run.head_sha;
}

export function publisherDispatch({sha,archiveSha256,version}) {
 assert(shaPattern.test(sha??'')&&digestPattern.test(archiveSha256??''),'Invalid publication source or checksum');
 const {channel}=releaseVersion('v'+version);
 return {ref:'main',inputs:{source_sha:sha,artifact_sha256:archiveSha256,distribution_tag:channel,publish_mode:'publish'}};
}

export function githubClient(token,fetcher=fetchTimed) {
 assert(token,'GitHub dispatch token unavailable');
 return async(path,{method='GET',body,expected=[200]}={})=>{
  assert(path.startsWith('repos/')&&!path.includes('..'),'Unexpected GitHub resource');
  const response=await fetcher('https://api.github.com/'+path,{method,headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
  assert(expected.includes(response.status),`GitHub ${method} ${path} returned ${response.status}`);
  const text=await response.text();assert(text.length<=2*1024*1024,'Oversized GitHub response');
  return {status:response.status,data:text?JSON.parse(text):null};
 };
}

async function resolveTag(api,path,reference) {
 assert(reference?.ref===path.replace(/^repos\/[^/]+\/[^/]+\/git\/ref\//,'refs/'),'Unexpected tag reference');
 let object=reference.object;
 for(let depth=0;object?.type==='tag'&&depth<4;depth++){
  assert(shaPattern.test(object.sha??''),'Invalid annotated tag object');
  object=(await api(path.replace(/\/git\/ref\/tags\/.*$/,'/git/tags/'+object.sha))).data?.object;
 }
 assert(object?.type==='commit'&&shaPattern.test(object.sha??''),'Tag does not resolve to a commit');
 return object.sha;
}

export async function assertTagAvailable(api,{repository,tag,sha}) {
 releaseVersion(tag);assert(shaPattern.test(sha??''),'Invalid publication commit');
 const root='repos/'+repository;
 assert((await api(root)).data?.full_name===repository,'Repository identity changed');
 const path=root+'/git/ref/tags/'+encodeURIComponent(tag),reference=await api(path,{expected:[200,404]});
 if(reference.status===404){assert(reference.data?.message==='Not Found','Tag absence is ambiguous');return 'absent';}
 assert(await resolveTag(api,path,reference.data)===sha,'Existing tag conflicts with this publication source');
 return 'exact-source';
}

export async function ensureTagAndDispatch(api,{repository,tag,sha,filename,archiveSha256,archiveBytes}) {
 releaseVersion(tag);assert(shaPattern.test(sha??'')&&digestPattern.test(archiveSha256??'')&&Number.isSafeInteger(archiveBytes)&&archiveBytes>0,'Invalid completed publication identity');
 const root='repos/'+repository;
 assert((await api(root)).data?.full_name===repository,'Repository identity changed');
 const path=root+'/git/ref/tags/'+encodeURIComponent(tag);
 let reference=await api(path,{expected:[200,404]});
 if(reference.status===404){
  assert(reference.data?.message==='Not Found','Tag absence is ambiguous');
  await api(root+'/git/refs',{method:'POST',body:{ref:'refs/tags/'+tag,sha},expected:[201,422]});
  reference=await api(path);
 }
 assert(await resolveTag(api,path,reference.data)===sha,'Existing release tag points at another source; never overwrite');
 const release=await api(root+'/releases/tags/'+encodeURIComponent(tag),{expected:[200,404]});
 if(release.status===200){
  const data=release.data,archive=data?.assets?.find(asset=>asset.name===filename),checksums=data?.assets?.find(asset=>asset.name==='SHA256SUMS');
  assert(data.tag_name===tag&&data.draft===false&&archive?.digest==='sha256:'+archiveSha256&&archive.size===archiveBytes&&checksums?.size>0,'Existing release identity or assets differ; never overwrite');
  return {state:'already-complete',tag,sha};
 }
 assert(release.data?.message==='Not Found','Release absence is ambiguous');
 await api(root+'/actions/workflows/tag-release.yml/dispatches',{method:'POST',body:{ref:tag},expected:[204]});
 return {state:'source-completion-dispatched',tag,sha};
}

async function plan(api,env) {
 assert(env.GITHUB_EVENT_NAME==='workflow_run','Automatic publication requires a workflow-run event');
 const event=JSON.parse(await readFile(env.GITHUB_EVENT_PATH,'utf8'));
 const [workflow,main]=await Promise.all([api('repos/'+repository+'/actions/workflows/verify.yml'),api('repos/'+repository+'/git/ref/heads/main')]);
 assert(main.data?.ref==='refs/heads/main'&&main.data.object?.type==='commit','Invalid current main reference');
 const sha=authorizeRun({event,workflow:workflow.data,expectedRepository:repository,checkoutSha:git(['rev-parse','HEAD']),remoteMainSha:main.data.object.sha,protectedRef:env.REF_PROTECTED});
 assert(env.GITHUB_REPOSITORY===repository&&env.APPROVED_SHA===sha,'Automatic source identity changed');
 const [pkg,lock,pin,delivery]=await Promise.all(['package.json','package-lock.json','docs-release-lock.json','docs-delivery.json'].map(path=>readFile(path,'utf8').then(JSON.parse)));
 const identity=validateStage({pkg,lock,pin,delivery,repository,expectedRepository:repository,ref:'refs/heads/main',protectedRef:env.REF_PROTECTED,sourceSha:sha,eventSha:sha,checkoutSha:sha,remoteMainSha:main.data.object.sha});
 const state=await registryState(fetchTimed,registry,identity.name,identity.version);
 assert(state==='absent'||state==='present','Registry version identity is unknown; no publication permitted');
 return {...identity,sha,publish:state==='absent'};
}

async function completedPublication(api,env) {
 const sha=env.APPROVED_SHA;
 assert(env.GITHUB_EVENT_NAME==='workflow_dispatch'&&env.GITHUB_REF==='refs/heads/main'&&env.GITHUB_REPOSITORY===repository&&env.REF_PROTECTED==='true','Unexpected publisher completion authority');
 assert(shaPattern.test(sha??'')&&sha===env.GITHUB_SHA&&sha===git(['rev-parse','HEAD'])&&digestPattern.test(env.EXPECTED_SHA256??''),'Completed publication source differs');
 // Publication already happened. A later accepted main must not strand its
 // exact earlier first-parent source or move the tag to the newer commit.
 git(['fetch','--no-tags','origin','main']);
 assert(git(['rev-list','--first-parent','refs/remotes/origin/main']).split('\n').includes(sha),'Published source is not eligible main history');
 const pkg=JSON.parse(await readFile('package.json','utf8')),tag='v'+pkg.version;
 await identityFromFiles({tag,repository:env.GITHUB_REPOSITORY,expectedRepository:repository,expectedName:'@'+repository.split('/')[0].replace(/design$/,'')+'/react'});
 const metadataResponse=await fetchTimed(registry+encodeURIComponent(pkg.name)+'/'+encodeURIComponent(pkg.version));
 assert(metadataResponse.status===200,'Published registry identity is unavailable');
 const metadata=await metadataResponse.json(),tarball=new URL(metadata?.dist?.tarball);
 assert(tarball.origin==='https://registry.npmjs.org'&&!tarball.username&&!tarball.password,'Unexpected published archive origin');
 const response=await fetchTimed(tarball.href);assert(response.status===200,'Published archive is unavailable');
 const reader=response.body.getReader(),chunks=[];let size=0;
 for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>32*1024*1024){await reader.cancel();throw Error('Published archive exceeds bounded payload');}chunks.push(Buffer.from(value));}
 const bytes=Buffer.concat(chunks);
 verifyPublishedArchive({bytes,metadata,name:pkg.name,version:pkg.version,expectedSha256:env.EXPECTED_SHA256});
 return ensureTagAndDispatch(api,{repository,tag,sha,filename:pkg.name.slice(1).replace('/','-')+'-'+pkg.version+'.tgz',archiveSha256:env.EXPECTED_SHA256,archiveBytes:bytes.length});
}

export async function main(command,env=process.env) {
 const api=githubClient(env.GH_TOKEN);
 if(command==='tag-available'){
  assert(env.GITHUB_REPOSITORY===repository&&shaPattern.test(env.APPROVED_SHA??'')&&env.APPROVED_SHA===git(['rev-parse','HEAD']),'Publication tag source differs');
  const pkg=JSON.parse(await readFile('package.json','utf8'));
  console.log(await assertTagAvailable(api,{repository,tag:'v'+pkg.version,sha:env.APPROVED_SHA}));return;
 }
 if(command==='complete'){console.log(JSON.stringify(await completedPublication(api,env)));return;}
 assert(command==='plan'||command==='dispatch','Unknown automatic release operation');
 const result=await plan(api,env);
 if(command==='plan'){
  if(env.GITHUB_OUTPUT)await appendFile(env.GITHUB_OUTPUT,`publish=${result.publish}\nname=${result.name}\nversion=${result.version}\n`);
  console.log(JSON.stringify({...result,state:result.publish?'unpublished-version':'existing-version-no-publication-attempted'}));return;
 }
 assert(result.publish,'Version appeared while preparing publication; never overwrite');
 const path=process.argv[3],stat=await lstat(path);assert(stat.isFile()&&!stat.isSymbolicLink()&&stat.size<=32*1024*1024,'Invalid automatic archive');
 const archiveSha256=createHash('sha256').update(await readFile(path)).digest('hex');
 const current=await api('repos/'+repository+'/git/ref/heads/main');
 assert(current.data?.ref==='refs/heads/main'&&current.data.object?.sha===result.sha,'Accepted main changed before publisher dispatch');
 await api('repos/'+repository+'/actions/workflows/stage-release.yml/dispatches',{method:'POST',body:publisherDispatch({sha:result.sha,archiveSha256,version:result.version}),expected:[204]});
 console.log(JSON.stringify({state:'publisher-dispatched',...result,archiveSha256}));
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await main(process.argv[2]);
