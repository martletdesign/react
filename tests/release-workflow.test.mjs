import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

test('protected tag completion has no npm authority and verifies staged publication first', async () => {
  const workflow = await readFile(new URL('../.github/workflows/tag-release.yml', import.meta.url), 'utf8');
  assert.doesNotMatch(workflow, /if: \$\{\{ false \}\}|id-token:|npm (?:publish|stage publish)/);
  assert.match(workflow, /contents: write/);
  assert.doesNotMatch(workflow, /environment:/);
  const stage = await readFile(new URL('../.github/workflows/stage-release.yml', import.meta.url), 'utf8');
  assert.match(stage, /environment: react-production-release/);
  assert.match(stage, /id-token: write/);
  assert.match(stage, /npm stage publish/);
  assert.match(workflow, /timeout-minutes: 15/);
  assert.ok(workflow.indexOf('verify-registry') < workflow.indexOf('gh release create'));
  assert.ok(workflow.indexOf('verify-provenance') < workflow.indexOf('gh release create'));
  assert.match(workflow, /npm audit signatures --json --include-attestations/);
  assert.match(workflow, /sha256sum --check SHA256SUMS/);
  assert.doesNotMatch(workflow, /verify-docs-published/);
  const cli = await readFile(new URL('../scripts/tag-release-cli.mjs', import.meta.url), 'utf8');
  assert.match(cli, /Registry version must already be published/);
  assert.match(cli, /verifyStagedProvenance\(\{audit,archive,name,version,repository,commit:process.env.GITHUB_SHA\}\)/);
});
test('unimplemented remote documentation archive blocks release', () => {
  const result = spawnSync(process.execPath, ['scripts/verify-docs-published.mjs'], {encoding:'utf8'});
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /documentation archive.*not implemented/);
});
