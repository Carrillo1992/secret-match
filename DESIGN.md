# Design

SecretMatch's visual identity: **Taller cálido**. Read this before designing or building any user-visible screen or component. The token values live in `frontend/src/styles.css` (`@theme`); this file is the intent behind them and the recipes that use them. Chosen in #48, where the prototype canvas with the rejected directions is linked.

## Personality

Warm and mysterious, with a playful touch. A gift being wrapped on a kitchen table, not a corporate dashboard. Festive all year round (birthdays, farewells, end of term), never seasonal: the palette is terracotta, cream, mustard and sage, so Christmas red/green and snow stay out.

Audience: groups of friends and family, mixed ages, mostly on a phone after tapping an invite link. Design **mobile-first** at ~375 px; desktop must work, but the phone is the case that decides.

References: Airbnb for warmth and clarity in everyday screens; Spotify Wrapped for the energy of reveals (big type, bold colour blocks, staged entrances).

## Colour

Every colour is a semantic role. The default Tailwind palette is switched off (`--color-*: initial`), so `bg-slate-50` or `text-red-700` simply do not exist: pick the role.

| Role | Use |
|---|---|
| `canvas` | Page background; also the inset well for a quiet section inside a sheet |
| `surface` | Sheets and cards that sit on the canvas |
| `field` | Input backgrounds |
| `subtle` | Quiet fills: icon badges, neutral chips |
| `ink` / `ink-muted` | Body text / secondary text, hints, captions |
| `line` | Input borders and dividers (meets 3:1 against `surface` and `canvas`) |
| `primary` / `primary-hover` / `on-primary` | The one main action per screen, links, focus rings |
| `success`, `success-soft` / `danger`, `danger-soft` | Feedback text / its tinted background |
| `mustard`, `sage`, `sage-soft`, `clay` | **Decoration only**: illustration, confetti, celebratory badges |

Dark mode follows `prefers-color-scheme` automatically: the same role names switch values in `styles.css`, so markup never carries `dark:` colour variants.

Contrast pitfall: `primary` text on `subtle` is 4.06:1 in light mode, below AA. Put primary-coloured text and links on `surface` or `canvas`; that is why an inset section holding a link or a secondary button uses `canvas`.

## Type

- **Display**: Outfit (`font-display`), bold, `tracking-tight`. Headings, button labels, the wordmark.
- **Body**: Nunito Sans (`font-sans`, the default). Everything else. Base size 16 px; hints and captions `text-sm`, never smaller.

| Level | Classes |
|---|---|
| Hero (landing, reveal name) | `font-display text-4xl font-bold tracking-tight` |
| Page title (`h1`) | `font-display text-3xl font-bold tracking-tight` |
| Section title (`h2`) | `font-display text-lg font-semibold` |
| Lead / intro paragraph | `text-base text-ink-muted` (`text-lg` on the landing) |
| Label | `font-bold` |
| Hint, caption, inline feedback | `text-sm` |

## Spacing

Tailwind's 4 px scale, used in a fixed rhythm so screens line up:

- `gap-1.5`: label → control → hint, inside one field.
- `mt-1.5`–`mt-2`: title → its intro paragraph.
- `gap-4`: between fields of a form.
- `mt-6`: between blocks (title block → form, form → footer link, section → section).
- Gutters: `px-6` on phone, `px-8` in the desktop card; content column `max-w-md`.

Both fonts are self-hosted through `@fontsource-variable/*`: no requests to Google.

## Shape and depth

Generous and soft. `rounded-field` (16 px) for inputs, `rounded-card` (28 px) for cards, `rounded-sheet` (32 px) for sheets, `rounded-full` for buttons and chips. Depth comes from `shadow-sheet` and `shadow-card` (soft, diffuse), and from surfaces stacked on the canvas. Hard 1 px outlines are kept for inputs.

## Recipes

The controls below are attribute directives in `shared/ui` that put the recipe on a native element, so each look has one source of truth and keeps native semantics. Never copy their class lists into a template; on the element, add only placement classes (`w-full`, `mt-6`), never colours or sizes. To change how a control looks, change its directive.

- **Primary button / link-as-button**: `<button appButton>` or `<a appButton>` (`Button`, `shared/ui/button`): tall, filled terracotta, Outfit label, room for a leading icon, dimmed when disabled. Add `w-full` in a sheet.
- **Secondary button**: `appButton="secondary"`: shorter, outlined in `primary`, fills on hover.
- **Text input**: `<input appField>` (`Field`, `shared/ui/field`): `rounded-field` on `bg-field` with a `line` border that turns `danger` when `aria-invalid` is set. The screen keeps the label (`font-bold`) above, the hint (`text-sm text-ink-muted`) or error (`text-sm font-semibold text-danger`) below, and the `aria-invalid` / `aria-describedby` wiring.
- **Inline link**: `<a appLink>` (`TextLink`, `shared/ui/text-link`): semibold, `primary`, underlined. A link standing on its own line (not inside a sentence) is `<a appLink standalone>`, which adds a 44 px touch target.
- **Alert**: `role="alert"` + `rounded-field bg-danger-soft px-4 py-3 text-sm font-semibold text-danger` (or the `success` pair). Still a class list: it has one use so far; it becomes a directive when a second screen needs it.

## Layout patterns

- **Sheet screen** (`app-sheet-layout` in `shared/ui`): the gift illustration on top and the content in a sheet rising over it; a centred card on wide screens. It is the doorway into the app: sign-up, sign-in, confirmations, invite landing.
- **Status screen** (`app-status-header` in `shared/ui`): an icon badge (`tone="good"` on `sage-soft`, `neutral` on `subtle`, 30 px icon) above the page title, then the explanation and one action. For outcomes: email sent, link verified or expired, something failed.
- One primary action per screen, at the bottom of the content on mobile.

## Icons and illustration

- **Icons**: Lucide line icons through `@lucide/angular`, imported one by one: `<svg lucideGift [size]="20"></svg>` with `LucideGift` in the component's `imports`. They are `aria-hidden` automatically; an icon-only button gets an `aria-label` on the button.
- **Illustration**: flat shapes in the decoration colours (`app-gift-illustration`), for the doorway screens (through the sheet layout) and emotional moments: empty states, the draw, the reveal. Screens inside the app once someone is in (group pages, wishlists, lists, settings) stay illustration-free so the moments that carry one stand out.

## Motion

Two levels:

- **Everyday**: micro-interactions of 150–250 ms (`transition-colors duration-200`) on hover, focus and state changes.
- **Key moments** (draw done, reveal, new mailbox message): expressive animation defined as `--animate-*` tokens in `@theme` (today `animate-bob` on the gift; each key-moment screen adds its own when it is built), applied with `motion-safe:` so `prefers-reduced-motion` gets the still version. Every gesture-driven animation also has a plain button alternative.

No sound, anywhere.

## Voice and tone (written copy)

Spanish, *tuteo*, warm. Winks are welcome in key moments ("¡Ya tienes a tu persona secreta! 🤫") and absent from forms and errors, where copy is plain and says how to fix the problem. Never reveal or hint at who someone's giver is (see the anonymity invariant in `CLAUDE.md`).

## Accessibility

WCAG 2.2 AA is the floor: text 4.5:1 (3:1 for 24 px+), UI boundaries 3:1, visible focus on everything interactive (`outline-primary`), touch targets at least 44 px, real `<button>`/`<a>`/`<label>`, and information that never depends on colour alone. New colour pairs get their contrast measured before they ship.

## Generic-look checklist

A screen has drifted when it shows: grey-on-white cards with thin borders, small square buttons, system fonts, blue links, several equal-weight buttons fighting for attention (the generic SaaS dashboard), or Christmas clipart (red/green, snow, Santa hats). Bring it back to the recipes above.
