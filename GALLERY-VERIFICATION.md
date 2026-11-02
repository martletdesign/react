# Gallery browser checks and runner limits

## Firefox hang

The old runner completed all JavaScript-enabled routes, then hung on the first JavaScript-disabled route at `await page.evaluate(() => document.fonts.ready)`. A limited Firefox reproduction showed that `document.fonts.status` was already `loaded`, but returning the ready promise did not settle through Playwright. A diagnostic three-second deadline failed at that exact operation. Old hosted runs in both language repositories likewise completed Chromium/WebKit and remained in the Firefox gallery step until cancellation.

The runner now polls synchronous `document.fonts.status` reads from Node until loaded. It does not return a page-side promise or use a page-side timer that depends on disabled JavaScript. The existing reflow measurement reads layout after font readiness. No browser, route, JavaScript-disabled case, response/heading/reflow/browser-error assertion, or axe assertion is removed.

## Bounds and diagnostics

- Browser operations: 15 seconds; navigation/launch: 30 seconds; axe: 45 seconds; page/context/browser/server cleanup: five seconds each.
- Every evaluate and axe/close operation has an external deadline; Playwright action/navigation defaults alone do not cover these operations.
- Whole browser script: three-minute watchdog, exit 1 on expiry. Operation failure and cleanup timeout also exit nonzero; no success summary is printed on failure. Timed-out pending browser calls cannot retain a failed runner indefinitely.
- Browser-test workflow step: four minutes; browser install: five minutes; each job: 15 minutes.
- Structured progress records identify family, engine, base, JavaScript mode, route, operation, state and elapsed time. Errors include the active operation/route and stack. The last start record identifies a stalled operation.

## Workflow scheduling

Feature changes run through pull requests, without a duplicate feature-push matrix. Push verification remains for main/develop. Workflow-level concurrency is keyed by workflow and PR number (or branch ref for pushes), with cancellation of obsolete runs. These settings take effect for runs using this workflow revision; they cannot retroactively group existing runs. Existing obsolete gallery-only runs were explicitly cancelled in both repositories.

A Firefox/root smoke job runs the full original route/JavaScript/axe assertions and deadline regression tests before the full six-cell matrix can start. A failed smoke test fails the workflow; the dependent matrix does not start. The full matrix retains Chromium, Firefox and WebKit at `/` and `/preview/`, with fail-fast disabled and at most two matrix jobs running concurrently. No timeout is treated as a pass.

## Validation

Limited Firefox/root checks passed in both repositories before running the full matrix. The full local matrix then passed all six cells per repository (48 route checks and six axe scans per repository). All 37 unit tests pass per repository, including never-settling-operation, browser-error, permanently-loading-font and unresponsive-font-evaluation failure controls. `actionlint` validates both workflows. Source fingerprints and per-cell results are in [the validation record](docs/qa/gallery-runner-validation.json); hosted results are recorded separately on the draft PRs at their exact heads.

To repeat one bounded cell after locked installation and browser installation:

```sh
npm run build
NIGHTJAR_BASE=/ npm run build:gallery
node scripts/check-gallery.mjs
DESIGN_BROWSER=firefox NIGHTJAR_BASE=/ node scripts/test-gallery-browser.mjs
```

Repeat gallery build/check/browser commands with `NIGHTJAR_BASE=/preview/` for subpath coverage. Keep the built base and test base equal. No publishing, release or deployment operation is involved.
