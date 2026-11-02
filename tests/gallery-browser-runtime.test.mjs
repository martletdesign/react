import test from 'node:test';
import assert from 'node:assert/strict';
import { bounded, waitForFonts } from '../scripts/gallery-browser-runtime.mjs';

test('a hung browser operation rejects on deadline and logs failure, never success', async () => {
  const events = [];
  await assert.rejects(bounded('hung evaluate', () => new Promise(() => {}), { timeoutMs: 25, log: e => events.push(e) }), /hung evaluate timed out/);
  assert.deepEqual(events.map(e => e.state), ['start', 'failed']);
});
test('browser errors remain failures and completed work retains its result', async () => {
  const error = new Error('browser disconnected');
  await assert.rejects(bounded('evaluate', () => { throw error; }), e => e === error);
  assert.equal(await bounded('evaluate', () => 42), 42);
});
test('font readiness polls until loaded', async () => {
  let reads = 0;
  await waitForFonts({ evaluate: async () => ++reads < 3 ? 'loading' : 'loaded' }, { timeoutMs: 500, pollMs: 1 });
  assert.equal(reads, 3);
});
test('loading fonts and unresponsive font evaluations both fail boundedly', async () => {
  await assert.rejects(waitForFonts({ evaluate: async () => 'loading' }, { timeoutMs: 25, pollMs: 1 }), /Fonts did not become ready|timed out/);
  await assert.rejects(waitForFonts({ evaluate: () => new Promise(() => {}) }, { timeoutMs: 25 }), /read font status timed out/);
  await assert.rejects(waitForFonts({ evaluate: async () => 'unknown' }), /Unexpected font readiness/);
});
