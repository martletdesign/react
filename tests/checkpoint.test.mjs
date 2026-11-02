import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {sha256} from '../scripts/docs-versions/contract.mjs';
import {checkpointBytes,verifyCheckpoint,verifyCheckpointChain} from '../infra/docs-archive/checkpoint.mjs';
const family=JSON.parse(await readFile(new URL('../docs-release-lock.json',import.meta.url),'utf8')).family,repo=`${family}design/react`,tag='v2.0.0',commit='a'.repeat(40),object='b'.repeat(40);
const value={schemaVersion:1,family,framework:'react',version:'2.0.0',source:{repository:repo,tag,commit},manifestSha256:'1'.repeat(64),catalogSha256:'2'.repeat(64),promotionSha256:'3'.repeat(64),previous:null};
const identity={family,repository:repo,tag,expectedCommit:commit};
async function fixture(testCase){const dir=await mkdtemp(join(tmpdir(),'nightjar-gh-checkpoint-'));try{const path=join(dir,'documentation-checkpoint.json'),bytes=checkpointBytes(value,identity);await writeFile(path,bytes);await testCase({path,bytes,sha:sha256(bytes),dir});}finally{await rm(dir,{recursive:true,force:true});}}
function fake({bytes,sha,tagName=tag,gitObject=object,gitCommit=commit,main=commit,mainTip=commit,remoteMain=mainTip,remote=object,immutable=true,failAt,origin=`https://github.com/${repo}.git`,assetDigest=sha}){
 const calls=[];const run=(program,args)=>{calls.push([program,...args]);if(failAt===`${program} ${args.slice(0,2).join(' ')}`)throw Error('simulated failure');
  if(program==='gh'&&args[0]==='api')return JSON.stringify({immutable,draft:false,tag_name:tagName,assets:[{name:'documentation-checkpoint.json',digest:`sha256:${assetDigest}`,size:bytes.length}]});
  if(program==='gh'&&args[0]==='release'&&['verify','verify-asset'].includes(args[1]))return '';
  if(program==='git'&&args[0]==='remote')return origin;
  if(program==='git'&&args[0]==='rev-parse'&&args[1]==='refs/remotes/origin/main')return mainTip;
  if(program==='git'&&args[0]==='ls-remote'&&args.at(-1)==='refs/heads/main')return `${remoteMain}\trefs/heads/main\n`;
  if(program==='git'&&args[0]==='rev-parse')return args[1].endsWith('^{commit}')?gitCommit:gitObject;
  if(program==='git'&&args[0]==='ls-remote')return `${remote}\trefs/tags/${tagName}\n`;
  if(program==='git'&&args[0]==='rev-list')return `${main}\n`;
  throw Error('unexpected command');};return {run,calls};
}
test('requires immutable signed release, exact asset, protected source identity and explicit pin',async()=>fixture(async({path,bytes,sha})=>{
 const f=fake({bytes,sha});const args={...identity,assetPath:path,expectedSha256:sha,run:f.run};assert.equal((await verifyCheckpoint(args)).sha256,sha);
 assert.deepEqual(f.calls.filter(x=>x[0]==='gh').map(x=>x.slice(1,3)),[['api',`repos/${repo}/releases/tags/${tag}`],['release','verify'],['release','verify-asset']]);
 await assert.rejects(verifyCheckpoint({...args,expectedSha256:'f'.repeat(64)}),/digest mismatch/);
 await assert.rejects(verifyCheckpoint({...args,expectedSha256:undefined}),/pins required/);
 for(const changes of [{remoteMain:'f'.repeat(40)},{remoteMain:''},{mainTip:'invalid'},{immutable:false},{assetDigest:'f'.repeat(64)},{gitCommit:'c'.repeat(40)},{remote:'d'.repeat(40)},{main:'e'.repeat(40)},{origin:'https://other.invalid/repo.git'},{failAt:'gh release verify'},{failAt:'gh release verify-asset'}]){
  await assert.rejects(verifyCheckpoint({...args,run:fake({bytes,sha,...changes}).run}));
 }
 // A recovery retry is read-only and verifies the same immutable bytes again.
 assert.equal((await verifyCheckpoint(args)).sha256,sha);assert.ok(f.calls.every(x=>!['create','edit','upload','delete','publish'].includes(x[2])));
}));
test('detects invalid asset, identity and truncated chain',async()=>fixture(async({path,bytes,sha,dir})=>{
 assert.throws(()=>checkpointBytes({...value,source:{...value.source,repository:'evil/react'}},identity),/source mismatch/);
 assert.throws(()=>checkpointBytes({...value,catalogSha256:'not-a-digest'},identity),/Invalid catalog/);
 const fakeRun=fake({bytes,sha}).run,args={...identity,assetPath:path,expectedSha256:sha,run:fakeRun};
 assert.deepEqual(await verifyCheckpointChain({entries:[{tag,expectedCommit:commit,assetPath:path,expectedSha256:sha}],expectedHeadSha256:sha,anchorSha256:sha,family,repository:repo,run:fakeRun}),{headSha256:sha,anchorSha256:sha,count:1});
 await assert.rejects(verifyCheckpointChain({entries:[{tag,expectedCommit:commit,assetPath:path,expectedSha256:sha}],expectedHeadSha256:sha,anchorSha256:'f'.repeat(64),family,repository:repo,run:fakeRun}),/Missing previous checkpoint/);
 await assert.rejects(verifyCheckpointChain({entries:[{tag,expectedCommit:commit,assetPath:path,expectedSha256:sha}],expectedHeadSha256:'e'.repeat(64),anchorSha256:sha,family,repository:repo,run:fakeRun}),/Trusted head/);
 await writeFile(path,Buffer.concat([bytes,Buffer.from(' ')]));await assert.rejects(verifyCheckpoint(args),/digest mismatch/);
}));

test('candidate preparation is create-only and does not invoke GitHub',async()=>fixture(async({dir})=>{
 const input=join(dir,'input.json'),output=join(dir,'candidate.json');await writeFile(input,JSON.stringify(value));
 const args=['scripts/docs-versions/checkpoint-cli.mjs','prepare',output,input,commit],env={...process.env,GITHUB_REPOSITORY:repo,RELEASE_TAG:tag};
 const first=spawnSync(process.execPath,args,{cwd:process.cwd(),env,encoding:'utf8'});assert.equal(first.status,0);assert.deepEqual(await readFile(output),checkpointBytes(value,identity));
 const again=spawnSync(process.execPath,args,{cwd:process.cwd(),env,encoding:'utf8'});assert.notEqual(again.status,0);assert.deepEqual(await readFile(output),checkpointBytes(value,identity));
}));

test('CLI drives read-only verifier executables and fails closed on a signature failure',async()=>fixture(async({dir,path,bytes,sha})=>{
 const {chmod}=await import('node:fs/promises');
 const gh=join(dir,'gh'),git=join(dir,'git');
 const mockGh=`#!/usr/bin/env node\nconst a=process.argv.slice(2);if(a[0]==='api')console.log(JSON.stringify({immutable:true,draft:false,tag_name:process.env.TEST_TAG,assets:[{name:'documentation-checkpoint.json',size:Number(process.env.TEST_SIZE),digest:'sha256:'+process.env.TEST_SHA}]}));else if(a[0]==='release'&&(a[1]==='verify'||a[1]==='verify-asset')){if(process.env.TEST_REJECT==='1')process.exit(1);}else process.exit(2);\n`;
 const mockGit=`#!/usr/bin/env node\nconst a=process.argv.slice(2);if(a[0]==='remote')console.log('https://github.com/'+process.env.TEST_REPO+'.git');else if(a[0]==='rev-parse'&&a[1]==='refs/remotes/origin/main')console.log(process.env.TEST_COMMIT);else if(a[0]==='ls-remote'&&a.at(-1)==='refs/heads/main')console.log(process.env.TEST_COMMIT+'\\trefs/heads/main');else if(a[0]==='rev-parse')console.log(a[1].endsWith('^{commit}')?process.env.TEST_COMMIT:process.env.TEST_OBJECT);else if(a[0]==='ls-remote')console.log(process.env.TEST_OBJECT+'\\trefs/tags/'+process.env.TEST_TAG);else if(a[0]==='rev-list')console.log(process.env.TEST_COMMIT);else process.exit(2);\n`;
 await writeFile(gh,mockGh);await writeFile(git,mockGit);await chmod(gh,0o700);await chmod(git,0o700);
 const env={...process.env,PATH:`${dir}:${process.env.PATH}`,GITHUB_REPOSITORY:repo,RELEASE_TAG:tag,TEST_TAG:tag,TEST_SIZE:String(bytes.length),TEST_SHA:sha,TEST_REPO:repo,TEST_COMMIT:commit,TEST_OBJECT:object};
 const args=['scripts/docs-versions/checkpoint-cli.mjs','verify',path,sha,commit];
 const good=spawnSync(process.execPath,args,{cwd:process.cwd(),env,encoding:'utf8'});assert.equal(good.status,0,good.stderr);assert.equal(JSON.parse(good.stdout).verified,true);
 const bad=spawnSync(process.execPath,args,{cwd:process.cwd(),env:{...env,TEST_REJECT:'1'},encoding:'utf8'});assert.notEqual(bad.status,0);assert.match(bad.stderr,/checkpoint verification failed/);
}));

test('two signed checkpoints retain their pinned lineage and reject a substituted parent',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'nightjar-gh-chain-'));try{
  const oldDir=join(dir,'old'),newDir=join(dir,'new');await mkdirBoth();async function mkdirBoth(){const {mkdir}=await import('node:fs/promises');await mkdir(oldDir);await mkdir(newDir);}
  const oldPath=join(oldDir,'documentation-checkpoint.json'),newPath=join(newDir,'documentation-checkpoint.json'),oldBytes=checkpointBytes(value,identity),oldSha=sha256(oldBytes);
  const newTag='v2.1.0',newCommit='c'.repeat(40),next={...value,version:'2.1.0',source:{...value.source,tag:newTag,commit:newCommit},previous:{tag,sha256:oldSha}};
  const newBytes=checkpointBytes(next,{...identity,tag:newTag,expectedCommit:newCommit}),newSha=sha256(newBytes);await writeFile(oldPath,oldBytes);await writeFile(newPath,newBytes);
  let activeTag;const run=(program,args)=>{
   if(program==='gh'&&args[0]==='api'){activeTag=args[1].split('/').at(-1);const b=activeTag===tag?oldBytes:newBytes;return JSON.stringify({immutable:true,draft:false,tag_name:activeTag,assets:[{name:'documentation-checkpoint.json',digest:`sha256:${sha256(b)}`,size:b.length}]});}
   if(program==='gh')return '';
   if(args[0]==='remote')return `https://github.com/${repo}.git`;
   if(args[0]==='rev-parse'&&args[1]==='refs/remotes/origin/main')return newCommit;
   if(args[0]==='ls-remote'&&args.at(-1)==='refs/heads/main')return `${newCommit}\trefs/heads/main\n`;
   if(args[0]==='rev-parse')return args[1].endsWith('^{commit}')?(activeTag===tag?commit:newCommit):object;
   if(args[0]==='ls-remote')return `${object}\trefs/tags/${activeTag}\n`;
   if(args[0]==='rev-list')return `${newCommit}\n${commit}\n`;
   throw Error('unexpected');};
  const entries=[{tag:newTag,expectedCommit:newCommit,assetPath:newPath,expectedSha256:newSha},{tag,expectedCommit:commit,assetPath:oldPath,expectedSha256:oldSha}];
  assert.equal((await verifyCheckpointChain({family,repository:repo,entries,expectedHeadSha256:newSha,anchorSha256:oldSha,run})).count,2);
  const injected=[{...entries[0],run:()=>{throw Error('untrusted runner invoked');},repository:'evil/react'},entries[1]];
  assert.equal((await verifyCheckpointChain({family,repository:repo,entries:injected,expectedHeadSha256:newSha,anchorSha256:oldSha,run})).count,2);
  await assert.rejects(verifyCheckpointChain({family,repository:repo,entries:[entries[0],{...entries[1],expectedSha256:'f'.repeat(64)}],expectedHeadSha256:newSha,anchorSha256:oldSha,run}),/discontinuity/);
 }finally{await rm(dir,{recursive:true,force:true});}
});
