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
- Dates and numbers go through `intlLocale()` (`core/language.ts`), never a hard-coded locale. Specs run in Spanish (`test-setup.ts`); set `secretmatch.language` in `localStorage` to test English.

## Gotchas

- The Preferences menu button sits in both layouts' headers, so a page spec that looks for "the first `button`" finds it. Query inside `main`, where the page's own content is.
- `@lucide/angular` is one ~11 MB module. The first import in a test run takes several seconds, so a spec that lazy-loads routes preloads it in `beforeAll` (see `src/app/app.spec.ts`).
