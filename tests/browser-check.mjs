import { build } from 'esbuild';
import { chromium, firefox, webkit } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, extname } from 'node:path';
import { createServer } from 'node:http';

const family = process.env.DESIGN_FAMILY;
if (!['martlet', 'krigsvold'].includes(family)) throw Error('Set DESIGN_FAMILY');
const browserName = process.env.DESIGN_BROWSER || 'chromium';
if (!['chromium', 'firefox', 'webkit'].includes(browserName)) throw Error('Invalid browser');
const temp = await mkdtemp(join(tmpdir(), 'nightjar-react-browser-'));
const entry = resolve('tests/browser-entry.jsx');
await build({ entryPoints: [entry, resolve('src/styles.css')], outdir: temp, entryNames: '[name]', bundle: true, jsx: 'automatic', loader: {'.woff2':'file', '.woff':'file', '.ttf':'file', '.svg':'file', '.png':'file'}, logLevel: 'silent' });
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>React test</title><link rel="stylesheet" href="styles.css"></head><body><main id="root"><h1>React test</h1><p>JavaScript is required for interactive controls.</p></main><script type="module" src="browser-entry.js"></script></body></html>`;
await writeFile(join(temp, 'index.html'), html);
const mime = {'.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.woff2':'font/woff2', '.woff':'font/woff', '.svg':'image/svg+xml'};
const server = createServer(async (req, res) => {
  const name = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).replace(/^\/(?:preview\/)?/, '') || 'index.html';
  if (name.includes('/') || name.includes('..')) { res.writeHead(404).end(); return; }
  try { const bytes = await readFile(join(temp, name)); res.writeHead(200, {'content-type': mime[extname(name)] || 'application/octet-stream'}).end(bytes); }
  catch { res.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const executablePath = browserName === 'chromium' ? process.env.PLAYWRIGHT_EXECUTABLE_PATH : undefined;
let browser;
try {
  browser = await ({ chromium, firefox, webkit })[browserName].launch(executablePath ? { executablePath } : {});
  for (const base of ['/', '/preview/']) {
    const context = await browser.newContext({ viewport: { width: 320, height: 720 } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => { if (response.url().startsWith(origin) && response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
    await page.goto(origin + base);
    await page.evaluate(() => document.fonts.ready);
    const field = page.getByRole('textbox', {name: 'Name'});
    assert.equal(await field.getAttribute('aria-invalid'), 'true');
    const ids = (await field.getAttribute('aria-describedby')).split(' ');
    assert.equal(ids.length, 2);
    for (const id of ids) assert.equal(await page.locator('[id]').evaluateAll((nodes, id) => nodes.filter(n => n.id === id).length, id), 1);
    await field.focus();
    await page.keyboard.type('Ada');
    assert.equal(await field.inputValue(), 'Ada');
    const button = page.getByRole('button', { name: 'Count 0' });
    await button.focus({timeout:5000}); await page.keyboard.press('Enter');
    assert.equal(await page.getByRole('button', { name: 'Count 1' }).count(), 1);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, '320px reflow');
    const results = await new AxeBuilder({page}).analyze();
    assert.deepEqual(results.violations.map(x => x.id), []);
    assert.deepEqual(errors, []);
    await context.close();
    const noJs = await browser.newPage({javaScriptEnabled:false});
    await noJs.goto(origin + base);
    assert.equal(await noJs.getByText('JavaScript is required for interactive controls.').count(), 1);
    await noJs.close();
  }
  console.log(`${family}: ${browserName} root and subpath browser checks passed`);
} finally {
  await browser?.close();
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
  await rm(temp, {recursive:true, force:true});
}
