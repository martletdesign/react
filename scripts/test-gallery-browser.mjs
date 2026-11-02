import { chromium, firefox, webkit } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, relative } from 'node:path';
import assert from 'node:assert/strict';
import { validBase } from '../examples/react-catalog/src/base.mjs';
import { bounded, waitForFonts, OPERATION_TIMEOUT_MS, NAVIGATION_TIMEOUT_MS, SCRIPT_TIMEOUT_MS } from './gallery-browser-runtime.mjs';

const family = 'martlet';
const root = resolve(`examples/react-catalog/dist/${family}`);
const base = process.env.NIGHTJAR_BASE || '/';
if (!validBase(base)) throw Error('Invalid base');
const engine = process.env.DESIGN_BROWSER || 'chromium';
if (!['chromium', 'firefox', 'webkit'].includes(engine)) throw Error('Invalid engine');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff' };
let scope = {}, activeOperation = 'startup';
const log = event => {
  if (event.state === 'start') activeOperation = event.operation;
  console.log(JSON.stringify({ family, engine, base, ...scope, ...event }));
};
const run = (operation, work, timeoutMs = OPERATION_TIMEOUT_MS) => bounded(operation, work, { timeoutMs, log });
const watchdog = setTimeout(() => {
  log({ operation: activeOperation, state: 'failed', error: `Gallery exceeded ${SCRIPT_TIMEOUT_MS}ms script deadline` });
  process.exit(1);
}, SCRIPT_TIMEOUT_MS);
const server = createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (!pathname.startsWith(base)) { res.writeHead(404).end(); return; }
    const name = pathname.slice(base.length), file = resolve(root, name + (pathname.endsWith('/') ? 'index.html' : ''));
    if (relative(root, file).startsWith('..')) { res.writeHead(404).end(); return; }
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': mime[extname(file)] || 'application/octet-stream' }).end(body);
  } catch { res.writeHead(404).end(); }
});
let browser;
try {
  await run('server.listen', () => new Promise((done, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', done);
  }));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const executablePath = engine === 'chromium' ? process.env.PLAYWRIGHT_EXECUTABLE_PATH : undefined;
  browser = await run('browser.launch', () => ({ chromium, firefox, webkit })[engine].launch({
    ...(executablePath ? { executablePath } : {}), timeout: NAVIGATION_TIMEOUT_MS,
  }), NAVIGATION_TIMEOUT_MS);
  for (const js of [true, false]) {
    scope = { javaScriptEnabled: js };
    const context = await run('context.new', () => browser.newContext({ javaScriptEnabled: js, viewport: { width: 320, height: 720 } }));
    context.setDefaultTimeout(OPERATION_TIMEOUT_MS);
    context.setDefaultNavigationTimeout(NAVIGATION_TIMEOUT_MS);
    for (const route of ['examples/', 'examples/article/', 'examples/dashboard-analytics/', 'examples/scientific-workspace/']) {
      scope = { javaScriptEnabled: js, route };
      const page = await run('page.new', () => context.newPage()), failures = [];
      page.on('pageerror', e => { failures.push(e.message); log({ operation: 'pageerror', state: 'diagnostic', error: e.message }); });
      page.on('response', r => {
        if (r.url().startsWith(origin) && r.status() >= 400) {
          failures.push(`${r.status()} ${r.url()}`);
          log({ operation: 'response', state: 'diagnostic', status: r.status(), url: r.url() });
        }
      });
      const response = await run('page.goto', () => page.goto(origin + base + route), NAVIGATION_TIMEOUT_MS);
      await run('response.status', () => assert.equal(response.status(), 200, route));
      await run('heading', async () => assert.ok(await page.getByRole('heading', { level: 1 }).count(), route));
      await run('fonts.ready', () => waitForFonts(page));
      await run('reflow', async () => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, route + ' reflow'));
      if (js && route === 'examples/article/') {
        await run('axe.analyze', async () => {
          const a = await new AxeBuilder({ page }).analyze();
          assert.deepEqual(a.violations.map(v => v.id), []);
        }, 45_000);
      }
      await run('browser.errors', () => assert.deepEqual(failures, [], route));
      await run('page.close', () => page.close(), 5_000);
      log({ operation: 'route', state: 'passed' });
    }
    scope = { javaScriptEnabled: js };
    await run('context.close', () => context.close(), 5_000);
  }
} catch (error) {
  log({ operation: activeOperation, state: 'failed', error: error.stack || String(error) });
  process.exitCode = 1;
} finally {
  scope = {};
  try {
    if (browser) await run('browser.close', () => browser.close(), 5_000);
  } catch { process.exitCode = 1; }
  try {
    server.closeAllConnections();
    if (server.listening) await run('server.close', () => new Promise((done, reject) => server.close(error => error ? reject(error) : done())), 5_000);
  } catch { process.exitCode = 1; }
  clearTimeout(watchdog);
}
// A timed-out operation may retain handles after bounded cleanup. Failed tests
// must terminate nonzero rather than occupying a runner or printing success.
if (process.exitCode) process.exit(process.exitCode);
log({ operation: 'gallery', state: 'passed' });
