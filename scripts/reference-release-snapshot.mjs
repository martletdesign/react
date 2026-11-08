// Versioned documentation belongs to its protected release source, not a later
// live reference-site commit. Reuse the existing archive builder unchanged.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {parseVersion} from './docs-versions/contract.mjs';

export function releaseTagCommit(advertisement,version) {
 const {version:parsed}=parseVersion(version),tag='refs/tags/v'+parsed,refs=new Map();
 for(const line of advertisement.trim().split('\n')) {
  const [sha,ref,...extra]=line.split('\t');
  assert(!extra.length&&/^[a-f0-9]{40}$/.test(sha??'')&&[tag,tag+'^{}'].includes(ref)&&!refs.has(ref),'Invalid published release tag advertisement');
  refs.set(ref,sha);
 }
 assert(refs.has(tag),'Published release tag is missing');
 return refs.get(tag+'^{}')??refs.get(tag);
}
export function verifyReleaseSource({pkg,pin,releasePackage,releasePin}) {
 const family=pin.family,repository=family+'design/react';
 assert(['martlet','krigsvold'].includes(family),'Unknown reference family');
 for(const manifest of [pkg,releasePackage]) {
  assert.equal(manifest.name,'@'+family+'/react','Release package belongs to another family');
  assert.equal(manifest.repository?.url,'git+https://github.com/'+repository+'.git','Release repository differs');
 }
 assert.equal(releasePackage.version,pkg.version,'Release version differs');
 assert.equal(releasePackage.private,true,'Expected the private tagged source manifest');
 assert.equal(releasePin.family,family,'Release lock belongs to another family');
 assert.equal(releasePin.core?.name,'@'+family+'/core','Release Core belongs to another family');
 assert.equal(releasePackage.dependencies?.[releasePin.core.name],releasePin.core.version,'Tagged Core dependency differs from its lock');
}
export function releaseSnapshotEnvironment(environment,overrides,tag) {
 return Object.fromEntries(Object.entries({...environment,...overrides,RELEASE_TAG:tag}).filter(([name])=>!name.startsWith('GITHUB_')&&name!=='SOURCE_DATE_EPOCH'));
}
export async function prepareReleaseSnapshot({root,pkg,pin,directory}) {
 const repository=pin.family+'design/react',remote='https://github.com/'+repository+'.git',tag='v'+parseVersion(pkg.version).version;
 assert(['martlet','krigsvold'].includes(pin.family)&&pkg.name==='@'+pin.family+'/react','Invalid reference authority');
 assert.equal(pkg.repository?.url,'git+'+remote,'Reference repository differs');
 const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8',timeout:30000,stdio:['ignore','pipe','pipe']}).trim();
 const advertisement=git(['ls-remote','--tags',remote,'refs/tags/'+tag,'refs/tags/'+tag+'^{}']);
 const commit=releaseTagCommit(advertisement,pkg.version);
 try {git(['cat-file','-e',commit+'^{commit}']);} catch {git(['fetch','--no-tags','--depth=1',remote,commit]);}
 let added=false;
 const close=()=>{if(added){git(['worktree','remove','--force',directory]);added=false;}};
 try {
  git(['worktree','add','--detach',directory,commit]);added=true;
  const read=path=>readFile(join(directory,path),'utf8').then(JSON.parse);
  const [releasePackage,releasePin]=await Promise.all([read('package.json'),read('docs-release-lock.json')]);
  verifyReleaseSource({pkg,pin,releasePackage,releasePin});
  return {commit,tag,directory,close,build(overrides){
   execFileSync(process.execPath,['scripts/docs-versions/build-release.mjs'],{cwd:directory,env:releaseSnapshotEnvironment(process.env,overrides,tag),stdio:'inherit',timeout:240000});
  }};
 } catch(error) {close();throw error;}
}
