# Frontend

Angular SPA. Structure and conventions: `docs/architecture.md` §3 and `CODING_STANDARDS.md` §3; checks to run: `docs/verification.md`.

## New screens go through `/design`

Before creating a page or any user-visible component, run the `design` skill: it offers the human layout options and records the choice on the ticket. Build only the chosen option. Purely structural code that renders nothing visible of its own (directives, services, data-access, a wrapper that only passes content through) skips it; a layout or wrapper that draws anything goes through `/design`.

## Styling

- `DESIGN.md` (repo root) is the visual language; `src/styles.css` holds its tokens in `@theme`. Style with the semantic roles (`bg-surface`, `text-ink-muted`, `bg-primary`…): the default Tailwind palette is switched off, so its class names render nothing.
- Dark mode is automatic: the roles switch value under `prefers-color-scheme`, so templates carry no `dark:` colour variants.
- A new token goes into `@theme` (with its dark value) and into `DESIGN.md` in the same change.
- Icons: `@lucide/angular`, one standalone import per icon (`LucideGift` → `<svg lucideGift>`).

## Gotcha

`@lucide/angular` is one ~11 MB module. The first import in a test run takes several seconds, so a spec that lazy-loads routes preloads it in `beforeAll` (see `src/app/app.spec.ts`).
