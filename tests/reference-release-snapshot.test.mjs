import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtemp,mkdir,readFile,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {releaseTagCommit,releaseSnapshotEnvironment,verifyReleaseSource,prepareReleaseSnapshot} from '../scripts/reference-release-snapshot.mjs';

test('release source resolves only the exact published lightweight or peeled tag',()=>{
 const a='a'.repeat(40),b='b'.repeat(40),ref='refs/tags/v0.2.1';
 assert.equal(releaseTagCommit(a+'\t'+ref,'0.2.1'),a);
 assert.equal(releaseTagCommit(a+'\t'+ref+'\n'+b+'\t'+ref+'^{}','0.2.1'),b);
 for(const value of ['',a+'\trefs/heads/main',a+'\t'+ref+'\n'+a+'\t'+ref,b+'\t'+ref+'^{}','invalid\t'+ref])assert.throws(()=>releaseTagCommit(value,'0.2.1'));
});
test('tagged snapshots reject cross-family authority and keep foreign event identity out of the child',()=>{
 const pkg={name:'@martlet/react',version:'0.2.1',private:true,repository:{url:'git+https://github.com/martletdesign/react.git'},dependencies:{'@martlet/core':'2.2.4'}},pin={family:'martlet',core:{name:'@martlet/core',version:'2.2.4'}};
 verifyReleaseSource({pkg,pin,releasePackage:pkg,releasePin:pin});
 for(const change of [x=>x.releasePackage.name='@krigsvold/react',x=>x.releasePackage.version='0.2.2',x=>x.releasePin.core.name='@krigsvold/core',x=>x.releasePackage.repository.url='git+https://github.com/foreign/react.git']){const bad={pkg:structuredClone(pkg),pin:structuredClone(pin),releasePackage:structuredClone(pkg),releasePin:structuredClone(pin)};change(bad);assert.throws(()=>verifyReleaseSource(bad));}
 assert.deepEqual(releaseSnapshotEnvironment({PATH:'keep',GITHUB_SHA:'foreign',GITHUB_REF:'refs/heads/main',GITHUB_TOKEN:'unused',SOURCE_DATE_EPOCH:'wrong'},{DOCS_DEPLOY_PREFIX:'/preview'},'v0.2.1'),{PATH:'keep',DOCS_DEPLOY_PREFIX:'/preview',RELEASE_TAG:'v0.2.1'});
});
test('actual tagged worktree builds the release source while a newer live commit remains unchanged',async()=>{
 const temp=await mkdtemp(join(tmpdir(),'reference-tag-context-')),root=join(temp,'repo'),snapshot=join(temp,'snapshot'),proof=join(temp,'proof.json');
 await mkdir(root);
 const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
 const pkg={name:'@martlet/react',version:'0.2.1',private:true,repository:{url:'git+https://github.com/martletdesign/react.git'},dependencies:{'@martlet/core':'2.2.4'}},pin={family:'martlet',core:{name:'@martlet/core',version:'2.2.4'}};let release;
 try {
  git(['init']);git(['config','user.name','Snapshot fixture']);git(['config','user.email','snapshot@example.test']);
  await writeFile(join(root,'package.json'),JSON.stringify(pkg));await writeFile(join(root,'docs-release-lock.json'),JSON.stringify(pin));await mkdir(join(root,'scripts/docs-versions'),{recursive:true});
  await writeFile(join(root,'scripts/docs-versions/build-release.mjs'),`import {writeFileSync} from 'node:fs';import {execFileSync} from 'node:child_process';writeFileSync(process.env.SNAPSHOT_PROOF,JSON.stringify({commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),tag:process.env.RELEASE_TAG,event:process.env.GITHUB_SHA??null}));`);
  git(['add','.']);git(['commit','-m','Released source']);const tagged=git(['rev-parse','HEAD']);git(['tag','v0.2.1']);
  await writeFile(join(root,'later-live-page.txt'),'Live site changed');git(['add','.']);git(['commit','-m','Later live site']);const live=git(['rev-parse','HEAD']);
  // Git's repository-local URL rewrite supplies a disposable transport fixture;
  // the production helper still requests only its canonical public repository.
  git(['config','url.file://'+root+'.insteadOf','https://github.com/martletdesign/react.git']);
  release=await prepareReleaseSnapshot({root,pkg,pin,directory:snapshot});assert.equal(release.commit,tagged);release.build({SNAPSHOT_PROOF:proof});
  assert.deepEqual(JSON.parse(await readFile(proof,'utf8')),{commit:tagged,tag:'v0.2.1',event:null});assert.equal(git(['rev-parse','HEAD']),live);assert.equal(git(['status','--porcelain']),'');
 } finally {release?.close();await rm(temp,{recursive:true,force:true});}
});
