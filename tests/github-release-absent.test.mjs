import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {releaseAbsent} from '../scripts/github-release-absent.mjs';

test('only a definite GitHub release 404 permits publication to proceed', async () => {
  const identity={repository:'example/core',tag:'v2.0.0-rc.1',token:'test-token'};
  let calls=0;
  await releaseAbsent(async (url, options)=>{
    calls++; assert.equal(options.redirect, 'error');
    if(calls===1){assert.equal(url,'https://api.github.com/repos/example/core');return {status:200,json:async()=>({full_name:'example/core'})};}
    assert.equal(url, 'https://api.github.com/repos/example/core/releases/tags/v2.0.0-rc.1');
    return {status:404,json:async()=>({message:'Not Found'})};
  }, identity);
  assert.equal(calls,2);
  const repo={status:200,json:async()=>({full_name:'example/core'})};
  async function lookup(result){let index=0;return releaseAbsent(async()=>index++===0?repo:result,identity);}
  for (const status of [200, 301, 401, 403, 429, 500, 502])
    await assert.rejects(lookup({status}));
  await assert.rejects(lookup({status:404,json:async()=>({message:'proxy error'})}));
  await assert.rejects(releaseAbsent(async()=>({status:200,json:async()=>({full_name:'other/core'})}),identity));
  await assert.rejects(releaseAbsent(async()=>{throw Error('network');},identity));
  await assert.rejects(releaseAbsent(async()=>({}),identity));
  for (const invalid of [{...identity,token:''},{...identity,repository:'../other'}, {...identity,tag:'v1/../../other'}])
    await assert.rejects(releaseAbsent(async()=>({status:404}),invalid));
});

test('release availability is checked before npm publication and again before release creation', async () => {
  const workflow=await readFile('.github/workflows/tag-release.yml','utf8');
  const checks=[...workflow.matchAll(/node scripts\/github-release-absent\.mjs/g)].map(match=>match.index);
  assert.equal(checks.length,2);
  assert.ok(checks[0] < workflow.indexOf('npm publish '));
  assert.ok(checks[1] > workflow.indexOf('npm publish ') && checks[1] < workflow.indexOf('gh release create '));
  assert.doesNotMatch(workflow,/gh release view/);
});
