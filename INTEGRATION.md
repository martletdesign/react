# Nightjar IV React integration into develop

## Source and history

This feature branch starts at develop `3c77b664ea80d0a58599dc5d7391b3d013c9570e` and contains local import merge `96b95cd6ef703d42ca34839a337509509ddb60f4` of reviewed #8 `13683d5176650ad2f4a63fef20ea47245cfb07d6`. The import tree `dc4c5fc9b114c186960b76f215b04094de0644fd` exactly equals the reviewed #8 tree. Every original PR head below remains an ancestor with its original commit object, authorship, merge history and source attribution. No original PR is retargeted, closed, squashed or merged remotely. Main/develop remain unchanged until an approved merge.

| Original PR | Retained exact head | Original base |
| --- | --- | --- |
| [#1](https://github.com/martletdesign/react/pull/1) | `7acbcdc17a99b70734aace9028ef00a2cef9b7cf` | `develop` |
| [#2](https://github.com/martletdesign/react/pull/2) | `f7e2cf172ede7721dd133e7a71f0cc83e9c0a497` | `feature/independent-react-source` |
| [#3](https://github.com/martletdesign/react/pull/3) | `579470889695727b19505a2ef95350f1084024e6` | `feature/independent-react-source` |
| [#4](https://github.com/martletdesign/react/pull/4) | `16cf4285a915309eacd5139f04096d674d3c3f1a` | `feature/independent-react-source` |
| [#5](https://github.com/martletdesign/react/pull/5) | `51eb10c15129407de393b46c7549bd21623165ae` | `feature/combined-react-candidate` |
| [#6](https://github.com/martletdesign/react/pull/6) | `7ffe7b32ce2f250c8cae17bb4e85960d1a079f7c` | `feature/local-docs-archives` |
| [#7](https://github.com/martletdesign/react/pull/7) | `dde837aef0484b5a7a34feb5f78d483b637897ef` | `feature/react-r2-archive` |
| [#8](https://github.com/martletdesign/react/pull/8) | `13683d5176650ad2f4a63fef20ea47245cfb07d6` | `feature/nightjar-iv-live-source-verification` |

The standalone component and gallery attribution in `PROVENANCE.md` and `examples/react-catalog/PROVENANCE.md` remains unchanged, including workbench source `04d3e14b1b1943cbf2a90f1a727822d87327b2ae` and frozen Nightjar II `80a5635abe4de7a07a1983de0b3ef796b101e047`.

## Changes beyond the reviewed candidate

The package source, styles, fixtures, gallery, dependencies/lockfiles, archive implementation, source attribution, and Firefox runner remediation are unchanged from #8. Changes are limited to five workflow files, the package/archive browser-check runners, and this integration evidence. Gallery workflow/runner/helper/regression tests remain byte-identical to #8.

All active workflows now cancel superseded commits using workflow-specific PR/ref concurrency, avoid duplicate feature pushes, and cap every job at 10–15 minutes. Package browser and archive browser matrices each cap at two; archive history caps at one. The gallery retains its Firefox smoke gate and complete three-engine × two-base matrix. At most ten jobs from one latest integration PR can run at once across these workflows; this is not an organization-wide quota across unrelated PRs. Verification is performed one family at a time, Martlet then Krigsvold, without redundant dispatches or matrix reruns.

Other browser runners reuse the reviewed 15-second operation/font guard, 30-second navigation/launch limit, 45-second axe limit, five-second cleanup limit and three-minute script watchdog. Browser steps have four-minute limits; installation has five-minute limits. Existing assertions are retained with identical AST arguments and order. The archived documentation runner keeps its existing bounded network-idle font/asset readiness check; it does not return an in-page ready promise. Timeouts remain nonzero failures. Final source comparison and assertion evidence is in [the provenance record](docs/qa/react-integration-provenance.json); exact-head hosted results are recorded on the consolidated PR.

## Release safety and merge decision

The package remains private and all three tag-publishing jobs remain explicitly disabled. The existing workbench React publisher is untouched; this integration does not authorize authority cutover, publication, production tags, trust changes or deployment. Nonpublishing rehearsals create only disposable local Git tags and use npm dry-run against localhost.

The integration PR targets develop and requires reviewed merge-commit integration, not a squash that discards attribution. Main/develop are currently reported unprotected; effective strict GitFlow required-review/check settings need maintainer configuration/verification before merge. Production archive/attestation, npm authority-cutover and deployment acceptance remain separate release gates, not evidence established by passing these development checks. Stop for the final integration approval; do not merge under this preparation task.
