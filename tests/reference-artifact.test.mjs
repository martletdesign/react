import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,symlink,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {inventory,verifyLocal,verifyAcceptedRef,validateArtifact,resolveBuildOutput,verifyReferenceIdentity} from '../scripts/reference-artifact.mjs';

test('reference verification rejects changed, missing, extra and symlink payloads',async()=>{
 const root=await mkdtemp(join(tmpdir(),'react-artifact-')),source={repository:'martletdesign/react',commit:'1'.repeat(40),tree:'2'.repeat(40)};
 try {
  const paths=['index.html','preview/index.html','docs/catalog.json','preview/docs/catalog.json'];
  for(const path of paths){await mkdir(join(root,path,'..'),{recursive:true});await writeFile(join(root,path),'fixture');}
  await writeFile(join(root,'version.json'),JSON.stringify({family:'martlet',framework:'react',source,delivery:{advancedArchive:{enabled:false}}}));
  const artifact={schemaVersion:1,family:'martlet',framework:'react',source,files:await inventory(root)};
  await writeFile(join(root,'artifact.json'),JSON.stringify(artifact));await verifyLocal(root,artifact);
  assert.deepEqual(await inventory(root),artifact.files);
  await writeFile(join(root,'index.html'),'corrupt');await assert.rejects(verifyLocal(root,artifact),/differs/);
  await writeFile(join(root,'index.html'),'fixture');await writeFile(join(root,'unexpected'),'extra');await assert.rejects(verifyLocal(root,artifact),/differs/);await rm(join(root,'unexpected'));
  await rm(join(root,'index.html'));await assert.rejects(verifyLocal(root,artifact),/differs/);
  await symlink(join(root,'version.json'),join(root,'index.html'));await assert.rejects(inventory(root),/Unsafe/);
  for(const path of ['../escape','/absolute','duplicate//path'])assert.throws(()=>validateArtifact({...artifact,files:[...artifact.files,{path,size:0,sha256:'0'.repeat(64)}]}));
 }finally{await rm(root,{recursive:true,force:true});}
});
test('adoption verifies only the exact live accepted branch without PR/CI history',()=>{
 const commit='1'.repeat(40),input={branch:'develop',commit,advertisement:commit+'\trefs/heads/develop\n'};
 verifyAcceptedRef(input);
 for(const change of [{branch:'feature/candidate'},{commit:'2'.repeat(40)},{advertisement:''},{advertisement:input.advertisement+input.advertisement}])assert.throws(()=>verifyAcceptedRef({...input,...change}));
});

test('reference outputs stay outside the real checkout, including dot-prefix and symlink parents',async()=>{
 const parent=await mkdtemp(join(tmpdir(),'react-output-')),root=join(parent,'source');
 try {
  await mkdir(root);await symlink(root,join(parent,'alias'));
  assert.equal(await resolveBuildOutput(root,join(parent,'artifact')),join(parent,'artifact'));
  for(const path of [undefined,root,join(root,'..artifact'),join(root,'inside'),join(parent,'alias','inside')])await assert.rejects(resolveBuildOutput(root,path),/outside the source/);
 }finally{await rm(parent,{recursive:true,force:true});}
});

test('the delivery entrypoint binds artifacts to its own repository, package and Core',()=>{
 const input={artifact:{family:'martlet',source:{repository:'martletdesign/react'}},version:{package:{name:'@martlet/react',version:'0.2.1'},core:{name:'@martlet/core',version:'2.2.4',integrity:'pinned'}},pkg:{name:'@martlet/react',version:'0.2.1',repository:{url:'git+https://github.com/martletdesign/react.git'}},pin:{family:'martlet',core:{name:'@martlet/core',version:'2.2.4',integrity:'pinned'}}};
 verifyReferenceIdentity(input);
 for(const mutate of [x=>x.artifact.family='krigsvold',x=>x.artifact.source.repository='krigsvolddesign/react',x=>x.version.package.name='@krigsvold/react',x=>x.version.core.version='2.2.3',x=>x.pkg.repository.url='git+https://github.com/untrusted/react.git']){const bad=structuredClone(input);mutate(bad);assert.throws(()=>verifyReferenceIdentity(bad));}
});
