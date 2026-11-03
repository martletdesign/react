import { readFile, access } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import assert from 'node:assert/strict';
const root=resolve('examples/react-catalog/dist/martlet');
const catalog=JSON.parse(await readFile('examples/page-archetypes/content/catalog.json'));
const selected=JSON.parse(await readFile('examples/react-catalog/src/selected.json'));
assert.equal(new Set(selected).size,50);
assert.equal(catalog.pages.length,50);
for(const id of selected) {
  const page=catalog.pages.find(page=>page.id===id); assert.ok(page, id);
  const html=await readFile(join(root,'examples',id,'index.html'),'utf8');
  assert.ok(html.includes('<h1'), `${id} lacks a heading`);
}
for(const id of ['dashboard-analytics','dashboard-administration','dashboard-operations','scientific-workspace']) {
  const html=await readFile(join(root,'examples',id,'index.html'),'utf8'); assert.ok(html.includes('<h1'), id);
}
await access(join(root,'examples/index.html'));
console.log('martlet: 47 canonical content routes, three dashboards, scientific workspace and index exist');
