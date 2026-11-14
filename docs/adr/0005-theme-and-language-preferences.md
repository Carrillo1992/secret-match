# Theme per device, Language per User, Spanish and English

Until #86, SecretMatch spoke only Spanish (UI and emails) and its dark mode only followed the operating system (`docs/architecture.md` §2.5 said "Spanish only for the MVP"). Spec #86 opens two choices to everyone, from a Preferences menu on every screen, signed in or not: the **Theme** (System, Light, Dark) and the **Language** (Spanish or English). The two are kept in different places on purpose.

## Decision

**Theme: per device, in the browser.**

- System (the default) keeps today's behaviour: `prefers-color-scheme` decides, live. Light and Dark override it.
- The choice lives in `localStorage` (`secretmatch.theme`), never on the User. Every access is wrapped in `try/catch`; with storage blocked it is System, and a choice lasts for the visit.
- A forced Theme is a `data-theme="light|dark"` attribute on `<html>`. `styles.css` declares the dark token values once, in a `dark` custom variant that applies them under `prefers-color-scheme: dark` unless `data-theme="light"`, and always under `data-theme="dark"`. Templates still carry no `dark:` colour variants.
- A small inline script in `index.html` sets the attribute from `localStorage` before Angular starts, so a forced Theme never flashes the other one. `ThemePreference` (`core/preferences`) owns it after that and uses the same key.

**Language: per User, Spanish (`es`) or English (`en`).**

- The Spanish copy in the templates stays the source; English is an `@angular/localize` translation. The Language is resolved before bootstrap: the choice saved in `localStorage`, else the first `es*` or `en*` in `navigator.languages`, else English. Switching reloads the page in the new Language; `<html lang>`, dates, numbers and the Google sign-in button follow it (#89).
- A User has a Language; existing Users get `es`. Sign-up (password or Google) sends the current one, and a Sign-up Verification keeps it. Signed in, changing it in the menu also saves it to the User (`PUT /api/v1/users/me/language`), and signing in applies the User's Language over the browser's (#88, #91).
- Every email goes out in its recipient's Language; the Verification email in its Sign-up Verification's. The triggering module still writes the text (ADR 0003), now in both Languages, and picks the recipient's (#92).
- Code, docs and API identifiers stay in English. English copy uses the `GLOSSARY.md` terms as they are.

## Consequences

- The Theme needs no API, no migration and no session: it works the same signed in or not, and a shared device keeps whatever was chosen on it last.
- A Language change is a full reload. The app never swaps copy at runtime, so no screen has to react to a Language change; the cost is a second load when someone switches.
- Every user-visible string and every email exists twice. A check fails when the English file is missing a message (#89), and the anonymity review of an email covers both Languages.
- Euros only: English formats them as `€25.00`.

## Considered Options

- **Theme saved on the User**: follows someone across devices, but needs an endpoint, a migration and a signed-in User, and a dark phone and a light office screen are a fair reason to differ per device. Out of scope in #86.
- **Language switched at runtime without reload** (a translation library swapping strings in place): no reload, but every formatted date and number, every cached string and Google's button would have to react to a change. A reload gets all of that from one resolution before bootstrap.
- **Language per Group**: a Group of mixed speakers has no single right answer, and emails reach one person at a time. Out of scope in #86.
