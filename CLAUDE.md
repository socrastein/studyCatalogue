# studyCatalogue

A personal catalogue of research studies: enter a study once (bibliographic details, topic tags, study design and
population), then find it again by search and filters, and copy a citation (APA, MLA, or a Reddit/markdown link).
Private for now, to be released later, so the global accessibility and usability standards apply.

## Commands

| Command                | What it does                                                      |
| ---------------------- | ----------------------------------------------------------------- |
| `npm run dev`          | Vite dev server                                                   |
| `npm run build`        | Typecheck, then production build into `dist/`                     |
| `npm run typecheck`    | TypeScript only                                                   |
| `npm test`             | Unit tests once (Vitest); `npm run test:watch` to watch           |
| `npm run test:browser` | Build, then Playwright browser tests in Firefox with axe (`e2e/`) |
| `npm run format`       | Prettier, whole repo; `format:check` is the CI form               |

CI (`.github/workflows/ci.yml`) runs format check, typecheck and unit tests on every push. Browser tests run locally:
the specs for the area while working and with each commit, the full suite before a merge into `main`.

## Layers (target design; dependencies point down only)

1. `src/catalogue/`: pure TypeScript domain (types, facets, tags, filtering, search, citations, serialization). No Vue,
   DOM or storage access.
2. `src/stores/`: Vue composables holding reactive state and persistence.
3. `src/views/`, `src/components/`: Vue single-file components. `src/router.ts` maps URLs to views; `src/App.vue` is
   the shell (skip link, header, nav).

`src/modules/` holds the original hand-built form and theme settings, which the steps above replace.

## Domain vocabulary

- **Tag**: a topic, with optional parents; filtering by a tag includes its descendants.
- **Facet**: a fixed vocabulary every study is described by: design, subjects (one value each), age groups, training
  statuses, sexes (several each; an empty list means "not reported").

Abbreviations allowed in names (beyond the global `id`): `doi`, `url`, `apa`, `mla`.
