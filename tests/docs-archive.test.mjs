import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {sha256} from '../scripts/docs-versions/contract.mjs';
import {createSnapshot} from '../scripts/docs-versions/snapshot.mjs';

test('a pinned local snapshot is created once, and older archives cannot be replaced or corrupted',async()=>{
  const root=await mkdtemp(join(tmpdir(),'docs-snapshot-'));try{
    const build=join(root,'build'),archives=join(root,'archives');await mkdir(build);await mkdir(archives);
    await writeFile(join(build,'index.html'),'<meta name="robots" content="noindex"><h1>Snapshot</h1>');
    const metadata={schemaVersion:1,family:'martlet',framework:'react',docsVersion:'2.0.0',basePath:'/docs/v/2.0.0/',implementation:{kind:'npm',name:'@martlet/react',version:'2.0.0',tag:'v2.0.0'},core:{name:'@martlet/core',version:'2.2.3',integrity:`sha512-${Buffer.alloc(64,1).toString('base64')}`},source:{repository:'martletdesign/react',commit:'a'.repeat(40),tag:'v2.0.0'},fixtures:{source:'repository'},toolchain:{node:'24.19.0',vite:'8.3.5'},createdAt:'2026-11-01T00:00:00.000Z',indexing:'noindex'};
    const lock={packages:{'node_modules/@martlet/core':{version:metadata.core.version,integrity:metadata.core.integrity}}};
    const baseline={schemaVersion:1,family:'martlet',framework:'react',latestStable:null,versions:[]},bytes=Buffer.from(JSON.stringify(baseline));
    const args={buildRoot:build,archiveRoot:archives,metadata,coreLock:lock,baselineBytes:bytes,baselineSha256:sha256(bytes)};
    await assert.rejects(createSnapshot({...args,baselineSha256:'f'.repeat(64)}),/Untrusted baseline/);
    await assert.rejects(createSnapshot({...args,coreLock:{packages:{}}}),/Exact core/);
    const first=await createSnapshot(args),manifestBefore=await readFile(join(archives,'2.0.0','manifest.json'));
    assert.equal(first.version,'2.0.0');assert.equal(first.supported,false);
    await assert.rejects(createSnapshot(args),/EEXIST/);
    assert.deepEqual(await readFile(join(archives,'2.0.0','manifest.json')),manifestBefore);
    const previous={...baseline,latestStable:'2.0.0',versions:[{...first,supported:true}]},old=Buffer.from(JSON.stringify(previous));
    const next={...metadata,docsVersion:'2.1.0',basePath:'/docs/v/2.1.0/',implementation:{...metadata.implementation,version:'2.1.0',tag:'v2.1.0'},source:{...metadata.source,tag:'v2.1.0'}};
    await writeFile(join(archives,'2.0.0','index.html'),'tampered');
    await assert.rejects(createSnapshot({...args,metadata:next,baselineBytes:old,baselineSha256:sha256(old)}),/Integrity mismatch/);
  }finally{await rm(root,{recursive:true,force:true});}
});

test('documentation pins the matching independent core release',async()=>{
  const pkg=JSON.parse(await readFile('package.json','utf8')),pin=JSON.parse(await readFile('docs-release-lock.json','utf8'));
  assert.equal(pkg.name,`@${pin.family}/react`);assert.equal(pkg.private,true);
  assert.equal(pin.core.name,`@${pin.family}/core`);assert.equal(pkg.dependencies[pin.core.name],pin.core.version);
  assert.equal(pkg.dependencies[`@${pin.family}/theme`],undefined);
  assert.match(pin.core.version,/^\d+\.\d+\.\d+$/);assert.match(pin.core.integrity,/^sha512-[A-Za-z0-9+/]{86}==$/);
});


test('gallery base paths allow version names while rejecting traversal',async()=>{
  const {validBase}=await import('../examples/react-catalog/src/base.mjs');
  for(const good of ['/','/preview/','/docs/v/0.2.0/','/preview/docs/v/1.0.0-rc.1/']) assert.equal(validBase(good),true,good);
  for(const bad of ['//example/','/../','/docs/./v/','/docs/v/%2e%2e/','/docs/v/0.2.0','https://example/']) assert.equal(validBase(bad),false,bad);
});
