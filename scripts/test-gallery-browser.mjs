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
    for (const route of ['examples/', 'examples/article/', 'examples/search/', 'examples/dashboard-analytics/', 'examples/dashboard-administration/', 'examples/dashboard-operations/', 'examples/scientific-workspace/']) {
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
      if (js && /(?:search|dashboard-(?:administration|operations)|scientific-workspace)\/$/.test(route)) {
        await run('hydration', () => page.locator('.source-shell[data-enhanced=true]').waitFor());
        for (const mode of ['light', 'dark']) {
          await run('appearance.' + mode, async () => {
            const menu = page.locator('.ss-menu');
            if (await menu.getAttribute('aria-expanded') !== 'true') await menu.click();
            const appearance = page.locator('.ss-appearance');
            if (await appearance.getAttribute('aria-pressed') !== String(mode === 'dark')) await appearance.click();
            await menu.press('Escape');
            await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
            await waitForFonts(page);
            await page.waitForTimeout(100);
          });
          await run('enlarged-text.reflow.' + mode, async () => {
            const measurement = await page.evaluate(() => ({width: innerWidth, scrollWidth: document.documentElement.scrollWidth}));
            assert.ok(measurement.scrollWidth <= measurement.width, route + ' 200% text ' + mode + ': ' + JSON.stringify(measurement));
          });
          if (route === 'examples/search/' || route === 'examples/dashboard-administration/') {
            await run('placeholder.contrast.' + mode, async () => {
              const input = page.locator('input[placeholder]:enabled').first();
              await input.waitFor();
              const measurement = await input.evaluate(control => {
                const parse = color => { const values = color.match(/[\d.]+/g).map(Number); return [...values.slice(0, 3), values[3] ?? 1]; };
                const over = (front, back) => { const alpha = front[3] + back[3] * (1 - front[3]); return [...front.slice(0, 3).map((value, index) => (value * front[3] + back[index] * back[3] * (1 - front[3])) / alpha), alpha]; };
                const ancestors = []; for (let element = control; element; element = element.parentElement) ancestors.unshift(element);
                let background = [255, 255, 255, 1];
                for (const element of ancestors) background = over(parse(getComputedStyle(element).backgroundColor), background);
                const style = getComputedStyle(control, '::placeholder'), foreground = parse(style.color);
                foreground[3] *= Number(style.opacity) * Number(getComputedStyle(control).opacity);
                const effective = over(foreground, background);
                const luminance = color => color.slice(0, 3).map(value => value / 255).map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4).reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
                const a = luminance(effective), b = luminance(background);
                return {placeholder: control.placeholder, color: style.color, opacity: style.opacity, background, ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)};
              });
              log({operation: 'placeholder', state: 'diagnostic', mode, ...measurement});
              assert.ok(measurement.ratio >= 4.5, 'Normal placeholder contrast below 4.5: ' + JSON.stringify(measurement));
            });
          }
          if (route.includes('dashboard-')) {
            await run('enlarged-text.navigation.' + mode, async () => {
              const toggle = page.locator('.rd-nav-toggle');
              const fragments = await toggle.evaluate(button => {
                const text = [...button.childNodes].find(node => node.nodeType === Node.TEXT_NODE);
                if (!text) throw Error('Dashboard toggle label missing');
                return [...text.textContent.matchAll(/\S+/g)].map(match => {
                  const range = document.createRange(); range.setStart(text, match.index); range.setEnd(text, match.index + match[0].length);
                  return {word: match[0], lines: new Set([...range.getClientRects()].map(rect => Math.round(rect.top))).size};
                });
              });
              assert.equal(fragments.length, 2);
              assert.ok(fragments.every(word => word.lines === 1), 'Navigation label fragments a word: ' + JSON.stringify(fragments));
              await toggle.focus(); await toggle.press('Enter');
              assert.equal(await toggle.getAttribute('aria-expanded'), 'true');
              await page.locator('.rd-nav nav a').first().focus(); await page.keyboard.press('Escape');
              assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
              assert.equal(await toggle.evaluate(button => button === document.activeElement), true);
            });
          }
        }
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
