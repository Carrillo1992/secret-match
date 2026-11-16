# Frontend

Angular SPA. Structure and conventions: `docs/architecture.md` §3 and `CODING_STANDARDS.md` §3; checks to run: `docs/verification.md`.

## New screens go through `/design`

Before creating a page or any user-visible component, run the `design` skill: it writes a briefing, has a subagent build the layout options as a throwaway visual prototype (`/prototype/<feature>?variant=`), and records the choice on the ticket. Build only the chosen option. Purely structural code that renders nothing visible of its own (directives, services, data-access, a wrapper that only passes content through) skips it; a layout or wrapper that draws anything goes through `/design`.

A `PreToolUse` hook (`.claude/hooks/require-design.sh`) enforces this: creating a new file under `features/*/pages/`, `features/*/components/` or `shared/ui/` (specs excepted) is denied until the `design` skill has run in the session. Editing existing files is not affected. The hook needs `jq`.

## Styling

- `DESIGN.md` (repo root) is the visual language; `src/styles.css` holds its tokens in `@theme`. Style with the semantic roles (`bg-surface`, `text-ink-muted`, `bg-primary`…): the default Tailwind palette is switched off, so its class names render nothing.
- Dark mode is automatic: the roles switch value under `prefers-color-scheme`, or under `data-theme` on `<html>` when the Theme is forced from the Preferences menu (ADR 0005), so templates carry no `dark:` colour variants. Dark values are written once, inside `@variant dark` in `styles.css`.
- A new token goes into `@theme`, its dark value into the `@variant dark` block, and both into `DESIGN.md` in the same change.
- Icons: `@lucide/angular`, one standalone import per icon (`LucideGift` → `<svg lucideGift>`).

## Copy in two Languages

The Spanish copy in the templates is the source; English is `src/locale/messages.en.json`, loaded at runtime before bootstrap (ADR 0005, `main.ts`). To add or change copy:

- Mark it: `i18n` on the element, `i18n-<attr>` for an attribute or input (`i18n-aria-label`, `i18n-label`), `` $localize`…` `` in TypeScript.
- Run `npm run extract-i18n` (rewrites `src/locale/messages.json`), then add the English entry under the same id in `messages.en.json`, using the `GLOSSARY.md` terms. Changing a Spanish message changes its id, so its English entry has to move too. `src/locale/translations.spec.ts` fails while any message has no English, and CI fails when `messages.json` is stale.
- Plurals and values go in ICU messages (`{count, plural, =1 {…} other {…}}`) and `$localize` placeholders (`${name}:name:`), never by concatenating strings. A `cond ? 'a' : 'b'` of copy becomes `@if` with an `<ng-container i18n>` per branch; an `aria-label` built from data comes from a component method that returns `$localize`.
- Dates and numbers go through `intlLocale()` (`core/language.ts`), never a hard-coded locale.
- Specs run in Spanish (`test-setup.ts`). An English spec (`*.en.spec.ts`, one per feature at least) imports `src/testing/english.ts` first, imports the component dynamically in a `beforeAll` (module-level `$localize` is translated as its module loads), and asserts `spanishLeftIn(page)` is empty. Spec files run isolated (`"isolate": true` in `angular.json`) so the English copy stays in its file.

## Deploying the SPA on Cloudflare Pages

Production serves the SPA from Cloudflare Pages (Git integration), not from the Docker image. The app reads `/config.json` at startup, so `npm run build:pages` runs the production build and then `pages/finish-build.mjs`, which writes `config.json` from the environment variables (the build fails without `API_BASE_URL`) and copies `pages/_headers` (caching and security headers, the Pages counterpart of `docker/nginx.conf`) into the output. Deep links need no `_redirects`: with no `404.html` in the output, Pages serves `index.html` for any path that is not a file. Project settings:

| Setting                | Value                                                                                                                                                           |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework preset       | None (the Angular preset assumes another output directory)                                                                                                      |
| Root directory         | `frontend`                                                                                                                                                      |
| Build command          | `npm run build:pages`                                                                                                                                           |
| Build output directory | `dist/secret-match/browser`                                                                                                                                     |
| Production branch      | `main`                                                                                                                                                          |
| Environment variables  | `API_BASE_URL` (the API origin, required), `GOOGLE_CLIENT_ID` (optional), `NODE_VERSION=26` (the build image defaults to an older Node; `.nvmrc` says the same) |

The config writer is tested with `npm run test:pages`. To try the output locally: `API_BASE_URL=http://localhost:8080 npm run build:pages`, then `npx wrangler pages dev dist/secret-match/browser`.

## PWA (installable app)

Production builds are an installable Progressive Web App (#117): `public/manifest.webmanifest`, the icons in `public/icons/` (192 and 512 `any`, a 512 `maskable` with the gift inside the safe zone, rendered once from `favicon.svg`) and Angular's service worker (`ngsw-config.json`, `serviceWorker` in the production configuration of `angular.json`). `provideServiceWorker` is off under `isDevMode()`, so `ng serve` runs without one.

- **What it caches:** only the app (`index.html`, the hashed bundles, the manifest, icons, fonts), so it opens fast and works as a shell offline. There are no `dataGroups`.
- **What it never touches:** the API and `/config.json`. API responses are private to one User and a shared device must never get them from a cache; `config.json` differs per deploy and is rewritten after `ng build`. The app registers `public/app-sw.js`, which stops every request to another origin and `/config.json` before Angular's `ngsw-worker.js` (imported below it) sees them, so the browser fetches them as if there were no service worker. Keep `config.json` out of `ngsw-config.json`.
- **Offline:** `loadAppConfig` (`core/config`) remembers the last `config.json` it read from the network in `localStorage` and uses it only when `/config.json` cannot be reached, so an installed app still starts offline and the landing shows "No podemos conectar con el servidor". Online, the network always wins.
- **Updates** (`core/updates/AppUpdates`): the service worker fetches a new deploy in the background; once it is ready (`VERSION_READY`), the next in-app navigation becomes a full page load of the new version. No prompt, and nothing typed is lost, because the User is leaving the page anyway. A new version is also looked for whenever the app comes back to the foreground; an `unrecoverable` state reloads the page.
- **Headers:** `ngsw.json`, `ngsw-worker.js`, `app-sw.js` and the manifest must never be served stale (`no-cache` in `pages/_headers` and `docker/nginx.conf`); a stale `ngsw.json` keeps installed apps on the old build.
- **Installing** (`core/install/AppInstall`, #118): Chromium's `beforeinstallprompt` is held back (no mini-infobar) and kept, from `main.ts` on, so an offer made before the app starts is not lost; "Instalar la app" in the Preferences menu and the Group page's install bar open that dialog, which works once per offer. iOS has no install API: any iOS browser gets the install guide instead. Already running installed (`display-mode: standalone`, `navigator.standalone`) or a browser that can do neither: nothing is offered. The install bar's memory (`secretmatch.install-suggestion` in `localStorage`, per device) is what DevTools → Application → Local storage shows; delete it to see the suggestion again. To try the Chromium path, the production build served as above must be installable; to see the iOS path on a desktop, emulate an iPhone in DevTools' device mode.
- **Try it locally:** `API_BASE_URL=http://localhost:8080 npm run build:pages`, then `npx wrangler pages dev dist/secret-match/browser`. Chrome DevTools → Application shows the manifest (no installability errors) and the active worker; `/ngsw/state` prints the worker's debug state. To test an update, rebuild and reload once (the new version downloads), then navigate inside the app. To start clean, Application → Storage → "Clear site data". Lighthouse no longer has a PWA category; DevTools' Manifest panel is the installability check.

## Gotchas

- The Preferences menu button sits in both layouts' headers, so a page spec that looks for "the first `button`" finds it. Query inside `main`, where the page's own content is.
- `@lucide/angular` is one ~11 MB module. The first import in a test run takes several seconds, so a spec that lazy-loads routes preloads it in `beforeAll` (see `src/app/app.spec.ts`).
