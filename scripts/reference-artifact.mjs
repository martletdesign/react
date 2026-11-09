import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {lstat,readFile,readdir,realpath} from 'node:fs/promises';
import {join,resolve,relative,dirname,basename,sep,isAbsolute} from 'node:path';

export const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
export async function resolveBuildOutput(root,requested) {
 assert(typeof requested==='string'&&requested.length>0,'Provide a fresh output directory outside the source checkout');
 const source=await realpath(root),path=resolve(requested),output=join(await realpath(dirname(path)),basename(path)),tail=relative(source,output);
 assert(tail.startsWith('..'+sep)||isAbsolute(tail),'Provide a fresh output directory outside the source checkout');
 return output;
}

const validPath=path=>typeof path==='string'&&/^[A-Za-z0-9._~/-]+$/.test(path)&&path.split('/').every(x=>x&&x!=='.'&&x!=='..');
export async function inventory(root,dir='') {
 const entries=[];
 for(const name of (await readdir(join(root,dir))).sort()) {
  const path=dir?dir+'/'+name:name,stat=await lstat(join(root,path));
  assert(validPath(path)&&!stat.isSymbolicLink(),'Unsafe reference artifact path');
  if(stat.isDirectory())entries.push(...await inventory(root,path));
  else {assert(stat.isFile(),'Reference artifact contains a non-regular file');if(path!=='artifact.json'){const bytes=await readFile(join(root,path));entries.push({path,size:bytes.length,sha256:digest(bytes)});}}
 }
 return entries.sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
}
export function validateArtifact(value) {
 assert(value?.schemaVersion===1&&value.framework==='react'&&['martlet','krigsvold'].includes(value.family),'Invalid reference artifact identity');
 assert(value.source?.repository===value.family+'design/react'&&/^[a-f0-9]{40}$/.test(value.source?.commit??'')&&/^[a-f0-9]{40}$/.test(value.source?.tree??''),'Invalid reference source identity');
 assert(Array.isArray(value.files)&&value.files.length>0,'Empty artifact inventory');
 const seen=new Set();
 for(const entry of value.files){assert(validPath(entry.path)&&entry.path!=='artifact.json'&&!seen.has(entry.path)&&Number.isSafeInteger(entry.size)&&entry.size>=0&&/^[a-f0-9]{64}$/.test(entry.sha256),'Invalid reference file inventory');seen.add(entry.path);}
 for(const path of ['version.json','index.html','preview/index.html','docs/catalog.json','preview/docs/catalog.json'])assert(seen.has(path),'Incomplete reference artifact: '+path);
 return value;
}
export async function verifyLocal(root,artifact) {
 validateArtifact(artifact);
 const stat=await lstat(root);assert(stat.isDirectory()&&!stat.isSymbolicLink(),'Artifact root must be a real directory');
 assert.deepEqual(await inventory(root),artifact.files,'Local reference payload differs from artifact inventory');
 const version=JSON.parse(await readFile(join(root,'version.json'),'utf8'));
 assert.equal(version.framework,artifact.framework,'Reference framework differs');assert.equal(version.family,artifact.family,'Reference family differs');
 assert.deepEqual(version.source,artifact.source,'Reference version/source identity differs');
 assert.equal(version.delivery?.advancedArchive?.enabled,false,'Advanced archive must remain disabled');
 return version;
}
export function verifyAcceptedRef({branch,commit,advertisement}) {
 assert(['main','develop'].includes(branch),'Only accepted main/develop can be adopted');
 const lines=advertisement.trim().split('\n');
 assert(lines.length===1&&lines[0]===commit+'\trefs/heads/'+branch,'Artifact is not the exact current accepted branch');
}

export function verifyReferenceIdentity({artifact,version,pkg,pin}) {
 const family=pin?.family,repository=family+'design/react';
 assert(['martlet','krigsvold'].includes(family)&&pkg?.name==='@'+family+'/react'&&pkg.repository?.url==='git+https://github.com/'+repository+'.git','Invalid local reference authority');
 assert.equal(artifact.family,family,'Artifact belongs to another family');
 assert.equal(artifact.source.repository,repository,'Artifact belongs to another repository');
 assert.deepEqual(version.package,{name:pkg.name,version:pkg.version},'Artifact package differs from local source');
 assert.deepEqual(version.core,pin.core,'Archived release Core differs from local source pin');
 if(version.referenceCore || pkg.dependencies?.[pin.core.name]?.startsWith('github:')) {
  assert.equal(version.referenceCore?.package,pin.core.name,'Reference Core belongs to another family');
  assert.equal(version.referenceCore?.source,pkg.dependencies[pin.core.name],'Reference Core differs from working source');
 }
}
