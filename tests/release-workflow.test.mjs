import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

test('all proposed release jobs are disabled and archive verification gates publishing', async () => {
  const workflow = await readFile(new URL('../.github/workflows/tag-release.yml', import.meta.url), 'utf8');
  assert.equal((workflow.match(/if: \${{ false }}/g) || []).length, 3);
  assert.match(workflow, /needs: \[verify, docs\]/);
  assert.match(workflow, /contents: write/);
  assert.match(workflow, /id-token: write/);
  assert.ok(workflow.indexOf('verify-docs-published.mjs') < workflow.indexOf('npm publish'));
  assert.ok(workflow.indexOf('verify-registry') < workflow.indexOf('gh release create'));
  assert.ok(workflow.indexOf('verify-provenance') < workflow.indexOf('gh release create'));
});
test('unimplemented remote documentation archive blocks release', () => {
  const result = spawnSync(process.execPath, ['scripts/verify-docs-published.mjs'], {encoding:'utf8'});
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /documentation archive.*not implemented/);
});
