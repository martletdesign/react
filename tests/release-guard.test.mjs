import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {releaseVersion, validateIdentity, productionCommit, registryState, verifyArchive, verifyProvenance} from '../scripts/tag-release-guard.mjs';
import {pkg,lock,developmentPkg,developmentLock} from './fixtures/release-source.mjs';
const repository = pkg.repository.url.replace(/^git\+https:\/\/github.com\//, '').replace(/\.git$/, '');
const input = {tag:`v${pkg.version}`,pkg,source:{version:pkg.version},lock,repository,expectedRepository:repository,expectedName:pkg.name};
test('version identity and exact core dependency fail closed', () => {
  assert.equal(validateIdentity(input).channel, pkg.version.includes('-') ? 'next' : 'latest');
  assert.equal(releaseVersion('v1.2.3-rc.1').channel, 'next');
  for (const tag of ['v01.2.3','v1.2','v1.2.3-01','1.2.3']) assert.throws(() => releaseVersion(tag));
  assert.throws(() => validateIdentity({...input, tag:'v9.9.9'}));
  assert.throws(() => validateIdentity({...input, repository:'wrong/repo'}));
  assert.throws(() => validateIdentity({...input, pkg:{...pkg,private:false}}));
  assert.throws(() => validateIdentity({...input, lock:{...lock,version:'9.9.9'}}));
  assert.throws(() => validateIdentity({...input, pkg:{...pkg,dependencies:{[Object.keys(pkg.dependencies)[0]]:'^2.0.0'}}}));
});
test('protected tag and production history are mandatory', () => {
  const sha = 'a'.repeat(40); const tag='v0.2.0';
  const git = args => args[0] === 'ls-remote' ? `${sha} refs/tags/${tag}` : sha;
  assert.doesNotThrow(() => productionCommit({git,tag,sha,protectedRef:'true'}));
  assert.throws(() => productionCommit({git,tag,sha,protectedRef:'false'}));
  const different = args => args[0] === 'rev-list' ? 'b'.repeat(40) : git(args);
  assert.throws(() => productionCommit({git:different,tag,sha,protectedRef:'true'}));
  const altered = args => args[0] === 'ls-remote' ? `${'b'.repeat(40)} refs/tags/${tag}` : git(args);
  assert.throws(() => productionCommit({git:altered,tag,sha,protectedRef:'true'}));
});
test('registry errors remain unknown and existing versions are rejected', async () => {
  const present = async () => ({status:200,json:async()=>({name:pkg.name,versions:{[pkg.version]:{name:pkg.name,version:pkg.version}}})});
  assert.equal(await registryState(present,'https://registry.npmjs.org/',pkg.name,pkg.version), 'present');
  assert.equal(await registryState(async()=>({status:500}),'https://registry.npmjs.org/',pkg.name,pkg.version), 'unknown');
  assert.equal(await registryState(present,'http://registry.npmjs.org/',pkg.name,pkg.version), 'unknown');
});
test('archive identity, bytes and integrity are mandatory', () => {
  const archive=Buffer.from('archive'); const digest=createHash('sha512').update(archive).digest('base64');
  const data={local:archive,remote:archive,metadata:{name:pkg.name,version:pkg.version,dist:{integrity:`sha512-${digest}`}},name:pkg.name,version:pkg.version};
  assert.equal(verifyArchive(data),true);
  assert.equal(verifyArchive({...data,remote:Buffer.from('modified')}),false);
  assert.equal(verifyArchive({...data,metadata:{...data.metadata,name:'other'}}),false);
  assert.equal(verifyProvenance({audit:{invalid:[],missing:[],verified:[]},archive,name:pkg.name,version:pkg.version}),false);
});

test('development Core commits are not publishable package sources',()=>{
 if(Object.values(developmentPkg.dependencies).some(value=>value.startsWith('github:'))) assert.throws(()=>validateIdentity({...input,pkg:developmentPkg,lock:developmentLock}),/published core dependency/);
});
