# React reference hosting

The reference is a static Vite application. Its build prerenders React routes so each page has HTML before JavaScript loads. Cloudflare serves the resulting directory directly.

## Local commands

```sh
npm ci
npm run build
npm run preview
```

`npm run build` compiles the component package and builds the reference. `npm run build:package` compiles only the library. `npm run build:gallery` (also available as `build:reference`) builds only the reference. Core supplies all CSS. The build works in an ordinary checkout, including uncommitted edits, and does not fetch release tags or reconstruct historical sites.

## Cloudflare settings

| Setting | Value |
| --- | --- |
| GitHub repository | `martletdesign/react` |
| Root directory | repository root (`/`) |
| Build command | `npm run build` |
| Production deploy command | `npx wrangler deploy` |
| Branch preview command | `npx wrangler preview` |
| Static output directory | `examples/react-catalog/dist/martlet` |
| Production branch | `main` |
| Development branch | `develop` |

The root `wrangler.json` declares the static asset directory and the empty `previews` block required by Wrangler. It requires no Worker entrypoint, runtime bindings, deployment attestations, archive storage, or custom deployment scripts. Cloudflare's Git integration performs deployments on pushes to the configured branches. Pages can serve the same output directory without a Wrangler deployment command.

For a subpath build, set `NIGHTJAR_BASE=/preview/`; ordinary Cloudflare branch previews use `/` on their own hostname. Use Cloudflare's normal deployment history to roll back.

Website deployment does not publish npm packages or change versions. Package release controls remain separate; `docs-release-lock.json` is retained only for npm release dependency validation, not site builds. Prior package documentation is available in GitHub release tags.
