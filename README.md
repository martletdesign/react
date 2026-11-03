# Martlet React (experimental)

This independent repository contains the experimental `@martlet/react` component implementation. Existing npm releases remain available. Standalone staging is prepared in the reviewed `stage-release.yml` workflow and `react-production-release` environment; npm trust and publication authority must be verified during the coordinated workbench cutover.

## Development

Use Node 24: `npm ci --ignore-scripts`, then `npm test`. `npm pack --ignore-scripts` creates a local candidate archive. The public repository keeps `private:true` in its manifest to prevent accidental publication; the reviewed staging workflow creates a publishable manifest only in an isolated export.

The exact published `@martlet/core` dependency supplies styles. Import `@martlet/react/styles.css`; load `@martlet/core/fonts.css` separately if desired. The public component API is experimental. Refer to [the historical component contracts](https://github.com/k3jph/design-workbench/blob/80a5635abe4de7a07a1983de0b3ef796b101e047/docs/components.md) for behavior and acceptance criteria.

The independent reference catalog contains all 50 canonical recipes, three dashboards and the scientific workspace. Browser verification covers Chromium, Firefox and WebKit at root and `/preview/`. `npm run build:gallery` builds the static site in `examples/react-catalog/dist/martlet`; use the examples index at `/examples/`. `docs-delivery.json` explicitly disables the advanced remote archive pathway until live Worker isolation and independent anti-rollback authority are verified. The ordinary static documentation build is the production delivery path; it makes no administrator-immutable archive claim. Automated checks do not replace manual assistive-technology assessment. See PROVENANCE.md for the source baseline and ownership transition.

Build a complete deployment from a clean committed checkout with `npm run build:reference -- /fresh/output/path`. This assembles root and `/preview` catalogs plus checksum-verified static `/docs/v/0.2.0/` snapshots using the existing documentation implementation. `version.json` records the exact source, Core integrity and explicitly disabled advanced archive mode. The output is static-only and needs no storage credentials or Worker bindings beyond assets.

After npm stage approval, independently verify the exact registry archive and `npm audit signatures --json --include-attestations` output with `RELEASE_TAG=v0.2.0 APPROVED_SHA=<reviewed-main-sha> node scripts/tag-release-cli.mjs verify-stage-provenance <audit.json> <archive.tgz>`. This operation pins the standalone staging workflow, `main`, dispatch event and reviewed commit; the disabled tag workflow is a different identity.
