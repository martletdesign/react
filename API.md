# Martlet React API

Import components from `@martlet/react`, component styles from `@martlet/react/styles.css`, and optional locally served fonts from `@martlet/core/fonts.css`. Wrap related content in `className="martlet"` and an explicit `data-martlet="light"` or `"dark"` appearance. The exact public props are shipped in `dist/index.d.ts`; native controls preserve their React DOM props and refs where declared.

| Component | Contract and caller responsibility |
| --- | --- |
| `Button` | Native button; defaults to `type="button"`. Set `type="submit"` for submission. Variants: primary, secondary, quiet. |
| `TextInput`, `Select`, `Textarea` | Native form controls; supply label association and application state. |
| `Field` | Render-prop wrapper supplies control ID, hint/error descriptions and `aria-invalid`. Spread its control props onto the actual input. |
| `Checkbox`, `Radio`, `Switch` | Labelled native inputs. Own checked state with React or use native uncontrolled defaults; Switch uses checkbox semantics with role switch. |
| `Fieldset` | Related controls with a legend; preserve logical groups and individual labels. |
| `FileInput` | Native file selection; validation and upload transport belong to the application. |
| `Notice`, `Badge` | Status/content presentation; choose the declared notice variant and announce asynchronous changes at the relevant application region. |
| `ErrorSummary` | Linked validation messages with target IDs; keep the individual field error and the summary consistent. |
| `Disclosure` | Native details/summary relationship, usable without JavaScript. |
| `Dialog` | Controlled `open`, `title`, `onDismiss`; native modal focus containment and Escape. Update `open` when dismissal is requested and provide meaningful dialog content/actions. |
| `Tabs` | Controlled `items`, `value`, `onValueChange`, `label`; Arrow/Home/End move focus, Enter/Space activate. Disabled items are skipped. Manual activation does not discard application data. |
| `Pagination` | Controlled page/pageCount/onPageChange; disables unavailable directions and maintains focus when the current action becomes unavailable. Loading and server requests belong to the caller. |
| `DataTable` | Required caption, native table children and a labelled keyboard-focusable scroll region. Supply correct header scopes and cell relationships. |
| `DefinitionList` | Term/description items with rows, stack or grid layout. |
| `TableOfContents` | Links to caller-owned heading IDs, with declared depth and inline/index variants. |
| `Article` | Reading composition; keep contents, metadata and supporting context meaningful and correctly ordered. |
| `AppShell` | Brand, navigation, utilities and main content. Navigation placement: default, top, side or none; header appearance may be explicit. Use one page-level shell to keep the main landmark and skip target unique. |

## State, rendering and application patterns

React owns interaction state. The primitives do not provide a backend, authentication, persistence, fetch retries or routing. The standalone examples show collection/editor selection, validation and previous-result recovery, query/filter states, local CSV downloads, three dashboards and a scientific model. Their data is illustrative and reset on reload unless the example explicitly states otherwise. Preserve these distinctions when adapting the patterns to a real service.

Static rendering preserves content and native semantics. Enhanced examples explicitly disable JavaScript-only controls until hydration; their published tables/results remain readable. Interactive dialogs and tabs require JavaScript. Keep error, changed, loading and recovery messages adjacent to the task they describe; do not replace a previous successful result with an unlabelled failure state.

## Verification and limits

Root/subpath browser suites cover Chromium, Firefox and WebKit, keyboard and accessibility assertions. Enlarged-text regression checks cover dashboard navigation and scientific workspace reflow at 320 CSS pixels and 200% text. They do not establish a complete screen-reader, localization or bidirectional-text assessment. Retain native focus behavior, readable labels, error links, local fonts and family-specific compositions when extending the implementation. Original component rationale and source attribution remain in PROVENANCE.md and the historical workbench references.
