# @martlet/react changelog

## 0.1.0 — experimental candidate, unpublished

Initial 22-component React 19 API with native form controls, modal dialog, manual-activation tabs, article compositions, table and pagination. Includes family CSS, TypeScript declarations and MIT source.

Behavior and keyboard regression checks cover both families. Manual screen-reader review, RTL/localization and sustained consumer evidence remain open. See docs/components.md and docs/release-policy.md in the source repository. No prior React version requires migration.

- Add explicit AppShell navigation placement, navigation label, and header color-mode composition; preserve existing defaults.
- Add native family reference, application grammar, collection/editor consumer, and independently usable MCP/skill tooling in the workbench.

- Reconcile source type, control, table, quote and index roles; remove unsupported shell/title ornament and built-in colophon. Keep published theme 2.1.0 unchanged.
- Add TableOfContents depth and index/inline variants; separate article contents from supporting context; add DefinitionList rows/stack/grid layout choices in both families.
- Correct invalid styling to require aria-invalid=true; preserve native control and recovery behavior.
