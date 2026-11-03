import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,stat,symlink,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {catalogRouteId} from '../examples/react-catalog/src/route.mjs';
import {normalizePackageModes} from '../scripts/normalize-package-modes.mjs';
test('host root and preview hydrate only their explicit index and known catalog route shape',()=>{
 for(const base of ['/','/preview/']){assert.equal(catalogRouteId(base,base),'index');assert.equal(catalogRouteId(base+'index.html',base),'index');assert.equal(catalogRouteId(base+'examples/index.html',base),'index');assert.equal(catalogRouteId(base+'examples/article/index.html',base),'article');assert.equal(catalogRouteId(base+'examples/',base),'index');assert.equal(catalogRouteId(base+'examples/article/',base),'article');for(const bad of ['unknown','examples/article/extra/','examples/%61rticle/','examples/article//'])assert.equal(catalogRouteId(base+bad,base),undefined);}
 for(const base of ['/','/preview/','/docs/v/0.2.0/','/preview/docs/v/0.2.0/'])for(const id of ['dashboard-analytics','dashboard-administration','dashboard-operations','scientific-workspace'])for(const suffix of ['/','/index.html'])assert.equal(catalogRouteId(base+'examples/'+id+suffix,base),id);
 assert.equal(catalogRouteId('/previewed/examples/article/','/preview/'),undefined);
});
test('isolated package normalization produces canonical modes and rejects symlink payloads',async()=>{
 const root=await mkdtemp(join(tmpdir(),'react-package-mode-'));
 try{
  await mkdir(join(root,'dist'),{mode:0o700});await writeFile(join(root,'dist/index.js'),'export const value=1;', {mode:0o600});await writeFile(join(root,'README.md'),'Public package',{mode:0o600});await writeFile(join(root,'package.json'),JSON.stringify({files:['dist','README.md']}),{mode:0o600});
  await normalizePackageModes(root);
  for(const path of ['package.json','README.md','dist/index.js'])assert.equal((await stat(join(root,path))).mode&0o777,0o644);
  assert.equal((await stat(join(root,'dist'))).mode&0o777,0o755);
  await symlink(join(root,'README.md'),join(root,'dist/link'));await assert.rejects(normalizePackageModes(root),/Symbolic link/);
 }finally{await rm(root,{recursive:true,force:true});}
});
