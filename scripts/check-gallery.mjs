import {execFileSync} from 'node:child_process';
execFileSync(process.execPath,['scripts/sync-core-styles.mjs','--check'],{stdio:'inherit'});
import './check-style-ownership.mjs';
import { readFile, access } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import assert from 'node:assert/strict';
const config=JSON.parse(await readFile('wrangler.json','utf8'));
const root=resolve(config.assets.directory);
const base=process.env.NIGHTJAR_BASE||'/';
async function checkStyles(html) {
 for (const [,href] of html.matchAll(/<link[^>]+href="([^"]+\.css)"[^>]*>/g)) {
  const url=new URL(href,'https://reference.invalid'+base);
  if(url.origin!=='https://reference.invalid')continue;
  assert.ok(url.pathname.startsWith(base),'Stylesheet preserves deployment base: '+href);
  await access(join(root,url.pathname.slice(base.length)));
 }
}
const catalog=JSON.parse(await readFile('examples/page-archetypes/content/catalog.json'));
const selected=JSON.parse(await readFile('examples/react-catalog/src/selected.json'));
assert.equal(new Set(selected).size,50);
assert.equal(catalog.pages.length,50);
for(const id of selected) {
  const page=catalog.pages.find(page=>page.id===id); assert.ok(page, id);
  const html=await readFile(join(root,'examples',id,'index.html'),'utf8');
  await checkStyles(html); assert.ok(html.includes('<h1'), `${id} lacks a heading`);
}
for(const id of ['dashboard-analytics','dashboard-administration','dashboard-operations','scientific-workspace']) {
  const html=await readFile(join(root,'examples',id,'index.html'),'utf8'); await checkStyles(html); assert.ok(html.includes('<h1'), id);
}
await checkStyles(await readFile(join(root,'examples/index.html'),'utf8'));
console.log('martlet: 47 canonical content routes, three dashboards, scientific workspace and index exist');
