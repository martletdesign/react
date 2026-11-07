# @martlet/react changelog

## 0.2.1

- Correct enlarged-text dashboard navigation and scientific workspace reflow without reducing type size or removing content.
- Apply the existing semantic placeholder role with explicit opacity; use the native TextInput in canonical search so all enabled appearances retain readable contrast.
- Package owned API and installation guidance, reconcile published 0.2.0 facts and preserve historical source attribution.
- Complete deterministic standalone reference integrity and post-publication GitHub source Release verification; retain stage-only npm publication.
- Consume the corresponding Core type-declaration correction through an exact registry-backed dependency.

## 0.2.0 — published 2026-11-03

Standalone React 19 implementation with an exact published Core dependency, independent builds and verified staged npm publication. Historical preparation notes below are retained as provenance, not current publication status.

## 0.1.0 — published experimental API

The original preparation notes below retain the initial implementation rationale. Existing npm 0.1.0 is preserved; it is not the current standalone source release.

Initial 22-component React 19 API with native form controls, modal dialog, manual-activation tabs, article compositions, table and pagination. Includes family CSS, TypeScript declarations and MIT source.

Behavior and keyboard regression checks cover both families. Manual screen-reader review, RTL/localization and sustained consumer evidence remain open. See docs/components.md and docs/release-policy.md in the source repository. No prior React version requires migration.

- Add explicit AppShell navigation placement, navigation label, and header color-mode composition; preserve existing defaults.
- Add native family reference, application grammar, collection/editor consumer, and independently usable MCP/skill tooling in the workbench.

- Reconcile source type, control, table, quote and index roles; remove unsupported shell/title ornament and built-in colophon. Keep published theme 2.1.0 unchanged.
- Add TableOfContents depth and index/inline variants; separate article contents from supporting context; add DefinitionList rows/stack/grid layout choices in both families.
- Correct invalid styling to require aria-invalid=true; preserve native control and recovery behavior.
