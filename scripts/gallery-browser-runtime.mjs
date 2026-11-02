import { setTimeout as delay } from 'node:timers/promises';

export const OPERATION_TIMEOUT_MS = 15_000;
export const NAVIGATION_TIMEOUT_MS = 30_000;
export const SCRIPT_TIMEOUT_MS = 180_000;

// Default Playwright action timeouts do not bound evaluate(), axe or close().
export async function bounded(operation, work, { timeoutMs = OPERATION_TIMEOUT_MS, log = () => {} } = {}) {
  const started = Date.now();
  let timer;
  log({ operation, state: 'start' });
  try {
    const result = await Promise.race([
      Promise.resolve().then(work),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${operation} timed out after ${timeoutMs}ms`)), timeoutMs);
      }),
    ]);
    log({ operation, state: 'passed', elapsedMs: Date.now() - started });
    return result;
  } catch (error) {
    log({ operation, state: 'failed', elapsedMs: Date.now() - started, error: error.message });
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export async function waitForFonts(page, { timeoutMs = OPERATION_TIMEOUT_MS, pollMs = 100 } = {}) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    // Firefox with javaScriptEnabled:false returns synchronous values, but
    // awaiting document.fonts.ready never settles even when status is loaded.
    // Poll from Node: do not return a page-side promise or inject a page timer.
    const status = await bounded('read font status', () => page.evaluate(() => document.fonts.status), {
      timeoutMs: Math.max(1, deadline - Date.now()),
    });
    if (status === 'loaded') return;
    if (status !== 'loading') throw new Error(`Unexpected font readiness state: ${status}`);
    await delay(Math.min(pollMs, Math.max(1, deadline - Date.now())));
  }
  throw new Error(`Fonts did not become ready within ${timeoutMs}ms`);
}
