# The module that triggers an email writes its text

Each email in the catalogue (#6) has a trigger in a business module: password sign-up in `identity`, a Member joining in `group`, a Draw in `draw`, a Message in `mailbox`. The email delivery seam (#13) needed one shape for how those modules ask for an email.

We chose a single generic event, `notification.application.EmailRequested(recipient, subject, message, linkPath)`. The use case that triggers the email publishes it with the text already written in Spanish. `notification` wraps that text in the shared template (sender, branding, link into the app, footer) and sends it after the commit. The use case already holds the recipient, the names and the context, so writing the text there needs no extra lookups and no knowledge of other modules inside `notification`.

## Consequences

- Email text lives next to the use case that sends it, so each module is the only place to read its own emails.
- `notification` knows nothing about Groups, Draws or Mailboxes. It depends on no other module.
- The anonymity check for an email is part of the review of the module that sends it. `docs/architecture.md` §2.6 lists what to check.
- Changing the shared look or sender means editing only `BaseEmailTemplate`. Changing the wording of an email means editing only its use case.

## Considered Options

- **Business events, text written in `notification`**: modules publish events such as `MemberJoined` or `DrawMade`, and `notification` listens and writes every email. All the text would sit in one module, which makes it easier to review it all at once. But `notification` would depend on every module's events and need lookups (names, emails) through their application APIs. It would also grow one listener per email. Upgrade path, if keeping all the text in one place becomes worth that cost: add a listener in `notification` per event, and keep `EmailRequested` as the internal step.
