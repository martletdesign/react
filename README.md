# Martlet React

`@martlet/react` supplies 22 native React 19 components, TypeScript declarations and the corresponding Core styles. The 0.2 line preserves the independently published 0.2.0 API; 0.2.1 adds packaged API guidance, standalone delivery verification and enlarged-text corrections. The API remains experimental while consumer and assistive-technology coverage grows. No workbench server is needed to install, build or run it.

```sh
npm install @martlet/react react@^19 react-dom@^19
```

```tsx
import {Field, TextInput, Button} from '@martlet/react';
import '@martlet/react/styles.css';
import '@martlet/core/fonts.css';

export function NameForm() {
  return <div className="martlet" data-martlet="light">
    <form onSubmit={event => event.preventDefault()}>
      <Field label="Name" hint="Use the name shown on your record.">
        {control => <TextInput {...control} name="name" required />}
      </Field>
      <Button type="submit">Save</Button>
    </form>
  </div>;
}
```

Use the family scope and `data-martlet="light"` or `"dark"` on the application boundary. Core supplies foundations; React supplies component relationships and behavior. The optional local font import serves font assets from your application. [API.md](API.md) documents the supported controls, state ownership and accessibility responsibilities; generated `dist/index.d.ts` defines their exact props.

## Standalone examples and development

Use Node 24.19.0, run `npm ci --ignore-scripts`, then `npm test`. The editable independent catalog contains all 50 canonical examples, three dashboards and a scientific workspace. These use representative local data; saving, filtering, exports and recovery demonstrate application patterns, not a connected production service. Browser checks retain Chromium, Firefox and WebKit at root and `/preview/`, with bounded operations, diagnostics and failure deadlines. Automated checks do not replace manual assistive-technology review.

`npm run build:gallery` writes `examples/react-catalog/dist/martlet`; start at `/examples/`. Set `NIGHTJAR_BASE=/preview/` to exercise subpath delivery. From a clean committed checkout, `npm run build:reference -- /fresh/output/path` assembles both bases and checksum-verified `/docs/v/0.2.1/` snapshots. `version.json` records source and Core identity; `artifact.json` inventories every delivered file. `node scripts/verify-reference-deployment.mjs /output https://host develop` verifies the live accepted branch and every public payload before adoption. Deployment operations remain coordinated; source assembly alone does not prove a canonical website has been cut over. Explicit `/examples/` routes replace the former workbench catalog’s experimental root query selectors; this output does not ship that separate selector frontend or redirect `/reference/` to an unrelated content example.

The reference output supports native Cloudflare static delivery with no Worker JavaScript or runtime bindings. If the existing custom adapter is used instead, its only binding is ASSETS and its legacy query redirect must remain disabled. `docs-delivery.json` keeps the advanced remote archive disabled; this static delivery makes no administrator-immutable storage or independent anti-rollback guarantee. See [PROVENANCE.md](PROVENANCE.md) for retained source attribution.

## Publication

The repository remains `private:true` to prevent accidental local publication. Only the `stage-release.yml` trusted publisher stages an exact accepted `main` revision; npm owner approval is a separate operation. Never approve bootstrap sentinels or restage a published version. Protected tags complete GitHub source Releases only after registry bytes and cryptographically verified provenance match the exact `main` stage workflow and commit. Tag completion has no npm publication authority.

Reproduce publishable archives using npm 11.15.0: export the exact commit with `git archive`, change only the exported manifest to `private:false`, install and build there, run `node scripts/normalize-package-modes.mjs .`, then `npm pack --ignore-scripts`. The normalizer requires an isolated export and rejects symlinks. Verify the registry tarball and successful `npm audit signatures --json --include-attestations` output with `RELEASE_TAG=v0.2.1 APPROVED_SHA=<accepted-main-sha> node scripts/tag-release-cli.mjs verify-stage-provenance <audit.json> <archive.tgz>`.

Acceptance follows the [ratified GitFlow policy](https://github.com/k3jph/design-workbench/blob/develop/docs/GITFLOW-ACCEPTANCE.md): one fast required `test` check, zero required human reviewers, advisory extended suites. Accepted `develop` and `main` authorize their respective deployments. Source and artifact identity checks do not reconstruct PR reviews or historical CI results.
