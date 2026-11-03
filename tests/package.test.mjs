import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as components from '../dist/index.js';

test('standalone exports include the established controls', () => {
  for (const name of ['AppShell', 'Button', 'Field', 'Notice', 'Dialog', 'Tabs', 'DataTable', 'Pagination']) assert.equal(typeof components[name], 'function', name);
});
test('buttons preserve their safe default and explicit disabled state during SSR', () => {
  const html = renderToStaticMarkup(createElement(components.Button, { disabled: true }, 'Save'));
  assert.match(html, /<button\b/);
  assert.match(html, /type="button"/);
  assert.match(html, /disabled=""/);
  assert.match(html, />Save<\/button>/);
});
test('styles use the matching published core and preserve scoped identity', async () => {
  const css = await readFile(new URL('../dist/styles.css', import.meta.url), 'utf8');
  assert.match(css, /@import ["']@martlet\/core\/css["']/);
  assert.match(css, /\.martlet\b/);
  assert.doesNotMatch(css, /@(?:martlet|krigsvold)\/theme/);
});
