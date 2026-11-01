import assert from 'node:assert/strict';
import {appendFile,readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {identityFromFiles,productionCommit,realGit,registryState,verifyArchive,releaseVersion,verifyProvenance} from './tag-release-guard.mjs';

const repository='martletdesign/react',name='@martlet/react',registry='https://registry.npmjs.org/';
const tag=process.env.RELEASE_TAG;
const command=process.argv[2];
const version=command==='inspect'?undefined:releaseVersion(tag).version;
const fetchTimed=url=>fetch(url,{signal:AbortSignal.timeout(15000),redirect:'error'});
const packageURL=new URL(encodeURIComponent(name),registry).href;
const versionURL=`${packageURL}/${encodeURIComponent(version??'')}`;

if(command==='preflight') {
  if(process.env.RELEASE_ENVIRONMENT_READY!=='yes') throw Error('Protected release environment sentinel missing');
  const info=await identityFromFiles({tag,repository:process.env.GITHUB_REPOSITORY,expectedRepository:repository,expectedName:name});
  productionCommit({git:realGit,tag,sha:process.env.GITHUB_SHA,protectedRef:process.env.REF_PROTECTED});
  const state=await registryState(fetchTimed,registry,name,info.version);
  if(state!=='absent') throw Error(`Registry version state: ${state}`);
  await appendFile(process.env.GITHUB_OUTPUT,`name=${name}\nversion=${info.version}\nchannel=${info.channel}\n`);
} else if(command==='verify-tag') {
  await identityFromFiles({tag,repository:process.env.GITHUB_REPOSITORY,expectedRepository:repository,expectedName:name});
  productionCommit({git:realGit,tag,sha:process.env.GITHUB_SHA,protectedRef:process.env.REF_PROTECTED});
} else if(command==='inspect') {
  const archive=process.argv[3];
  const files=execFileSync('tar',['-tzf',archive],{encoding:'utf8'}).trim().split('\n');
  if(!files.every(p=>p.startsWith('package/')&&!p.includes('..')) || !['package/package.json','package/LICENSE','package/README.md','package/dist/index.js','package/dist/index.d.ts','package/dist/styles.css'].every(p=>files.includes(p))) throw Error('Unexpected package archive contents');
  const listing=execFileSync('tar',['-tvzf',archive],{encoding:'utf8'}).trim().split('\n');
  if(!listing.every(line=>line.startsWith('-'))) throw Error('Non-regular entry in package archive');
  const manifest=JSON.parse(execFileSync('tar',['-xOzf',archive,'package/package.json'],{encoding:'utf8'}));
  const source=JSON.parse(await readFile('package.json','utf8')); source.private=false;
  assert.deepEqual(manifest,source,'Packaged manifest differs from reviewed source except private flag');
} else if(command==='confirm-absent') {
  const state=await registryState(fetchTimed,registry,name,version);
  if(state!=='absent') throw Error(`Registry version state: ${state}`);
} else if(command==='verify-provenance') {
  const audit=JSON.parse(await readFile(process.argv[3],'utf8')),archive=await readFile(process.argv[4]);
  if(!verifyProvenance({audit,archive,name,version,repository,tag,commit:process.env.GITHUB_SHA})) throw Error('Verified provenance does not match the release workflow and commit');
} else if(command==='verify-registry') {
  const local=await readFile(process.argv[3]);
  let verified=false;
  for(let attempt=0;attempt<12;attempt++) {
    try {
      const r=await fetchTimed(versionURL); if(r.status!==200) throw Error('Registry version not available');
      const metadata=await r.json(); const tar=new URL(metadata.dist.tarball);
      if(tar.protocol!=='https:'||tar.hostname!=='registry.npmjs.org') throw Error('Unexpected tarball origin');
      const response=await fetchTimed(tar.href); if(response.status!==200) throw Error('Registry tarball unavailable');
      const reader=response.body.getReader(), chunks=[]; let size=0;
      for(;;) {const {done,value}=await reader.read(); if(done) break; size+=value.byteLength; if(size>local.length) {await reader.cancel(); throw Error('Registry tarball is larger than reviewed archive');} chunks.push(Buffer.from(value));}
      const remote=Buffer.concat(chunks);
      if(!verifyArchive({local,remote,metadata,name,version})) throw Error('Registry artifact differs from reviewed archive');
      verified=true; break;
    } catch (e) {if(attempt===11) throw e; await new Promise(resolve=>setTimeout(resolve,5000));}
  }
  if(!verified) throw Error('Registry verification incomplete');
} else {throw Error('Unknown release guard operation');}
