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
| `npm run build:home`   | `build`, then bundle the home server into `dist-server/`          |
| `npm run home:serve`   | Start the home server (needs `build:home` first); `home` = both   |

CI (`.github/workflows/ci.yml`) runs format check, typecheck and unit tests on every push. Browser tests run locally:
the specs for the area while working and with each commit, the full suite before a merge into `main`.

## Layers (target design; dependencies point down only)

1. `src/catalogue/`: pure TypeScript domain (types, facets, tags, filtering, search, citations, serialization). No Vue,
   DOM or storage access.
2. `src/stores/`: Vue composables holding reactive state and persistence.
3. `src/views/`, `src/components/`: Vue single-file components. `src/router.ts` maps URLs to views; `src/App.vue` is
   the shell (skip link, header, nav).

## The home server (`server/`, see "Running at Home" in README.md)

A small Node server (no framework, no dependencies beyond Node) that serves `dist/` and keeps the catalogue in a file, so
any device on the home network opens the same one. It is bundled by `vite.server.config.ts` into `dist-server/main.js`
because the app's source imports without file extensions, which plain `node` cannot resolve; it shares `src/catalogue`
(`homeServerProtocol.ts` holds the messages both sides read, validated with `parseCatalogue`).

- `GET /api/catalogue` answers `{ revision, catalogue }`; `PUT` with `{ baseRevision, catalogue }` saves only when
  `baseRevision` is the stored revision, otherwise 409 with the current copy. Writes are atomic; `versions/` keeps 20
  saves and one per UTC day for 60 days. No authentication, on purpose (home network behind a firewall).
- The store (`src/stores/catalogueStore.ts`) saves through a `CatalogueStorage` (`catalogueStorage.ts`): `browserStorage.ts`
  (localStorage, the default) or `homeServerStorage.ts` (ordered saves, merge on 409 with `backupMerge.ts`, retry while the
  server is away, refresh when the tab is visible). `startCatalogue.ts` picks one before the app mounts, by asking the
  same origin for `/api/catalogue`: a well-formed answer means home-server mode. A dev server answers with the app's own
  page, so Matt's real catalogue (localStorage on port 5173) is never touched by the server code.
- Server tests are in `server/*.test.ts` (Vitest, temp directories, port 4191). Browser specs for home mode are
  `e2e/homeServer.spec.ts` with `e2e/homeServerFixture.ts`, which starts a real server per test on ports 4192-4199.
  Port 4190 is on the browsers' blocked list; do not use it.

## The look (lifting-school-ui)

The styling is The Lifting School's shared library, `lifting-school-ui`, a git dependency pinned to a tag (`.npmrc`
allows git dependencies for this project's own `package.json` only). `src/main.ts` imports its CSS before
`src/style.css`. Its README (`node_modules/lifting-school-ui/README.md`) lists the tokens, classes and components.

- Upgrade by uninstalling, then installing the new tag:
  `npm uninstall lifting-school-ui && npm install "git+https://github.com/socrastein/liftingSchoolUI.git#vX.Y.Z"`.
  Editing the tag in `package.json` and reinstalling fails with EALLOWGIT.
- A change to the look itself (a token, a shared class, a component) is made and released in `../liftingSchoolUI`,
  never copied or overridden here.
- Components use the library's classes (`.btn` + variant, `.field`, `.input`, `.card`, `.panel`, `.alert`, ...) and
  its `FormField`, `FormFieldGroup` and `ConfirmDialog` (through `useConfirmation`). Scoped styles hold layout only, in
  tokens: `src/styleRules.test.ts` fails on any colour, size, spacing or duration that is not a token, apart from its
  listed exceptions (none so far).
- Dark mode is the library's `dark` class on `<html>`, switched by `ThemeButton` in the header and saved under
  `studyCatalogue.colorScheme` (`src/colorSchemeKey.ts`; `index.html` applies it before the first paint).

## Summaries and the website export

- A study may hold a `summary` (`catalogue/summary.ts`): short text written from the abstract or the full text, a draft until
  Matt approves it on the Review Summaries screen (`/review`, linked in the nav only while drafts wait). Summaries are
  never written by the app; drafts arrive in a backup merged in Settings. Editing an approved summary keeps it approved;
  a merge that replaces it with a newer draft does not (`backupMerge.ts`). Every change stamps `updatedAt`, which is how
  merges pick the newer copy.
- A full-text draft names the PDF it was written from (`summary.sourceFile`), shown on the review screen and never
  exported. Skip on that screen only reorders the queue for the visit; nothing is saved.
- Saved format is schema v2; v1 data still loads unchanged (`serialization.ts`).
- "Export for the Website" (`catalogue/websiteExport.ts`) is an explicit allow-list: a field is published only if the
  export names it, so a field added to `Study` stays private by default. Never spread a study into the export, and never
  export the abstract or an unapproved summary. A test pins the exact field list.
- Matt's real catalogue lived in his browser's localStorage on the dev server (port 5173) of the main folder until the
  home server (above) takes over. Develop and test in a worktree on other ports with test data, never write to
  `~/.local/share/studyCatalogue` (the home server's real data directory), and never run new code against his data.

## Domain vocabulary

- **Tag**: a topic, with optional parents; filtering by a tag includes its descendants.
- **Facet**: a fixed vocabulary every study is described by: design, subjects (one value each), age groups, training
  statuses, sexes (several each; an empty list means "not reported").

Browser specs find elements by role (`getByRole`), never `getByLabel`, and controls are named by `<label for>` rather
than `aria-labelledby` where possible: see the note in `e2e/expectNoAxeViolations.ts` about a Firefox crash
(microsoft/playwright#43967).

Abbreviations allowed in names (beyond the global `id`): `doi`, `url`, `apa`, `mla`.
