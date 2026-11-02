# Martlet React (experimental transfer candidate)

This independent repository candidate contains the experimental `@martlet/react` component implementation. It is not yet the publication authority. Existing npm releases remain available; no registry or workbench publication settings are changed by this proposal.

## Development

Use Node 24: `npm ci --ignore-scripts`, then `npm test`. `npm pack --ignore-scripts` creates a local candidate archive. Package source remains private until a separately approved release process creates a publishable manifest in isolation.

The exact published `@martlet/core` dependency supplies styles. Import `@martlet/react/styles.css`; load `@martlet/core/fonts.css` separately if desired. The public component API is experimental. Refer to [the historical component contracts](https://github.com/k3jph/design-workbench/blob/80a5635abe4de7a07a1983de0b3ef796b101e047/docs/components.md) for behavior and acceptance criteria.

Standalone browser, documentation-site and immutable release archive coverage remain to be completed. Automated checks do not replace manual assistive-technology assessment. See PROVENANCE.md for the source baseline and ownership transition.
