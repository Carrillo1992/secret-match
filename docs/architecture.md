# Architecture

This is the **target architecture** and the current map of the system. It says *what* the parts are and *how* they connect. *Why* a hard-to-reverse choice was made lives in `docs/adr/`. Domain terms live in `GLOSSARY.md`.

Items marked 🟡 are open decisions. Settle them through grilling/specs and record an ADR when the choice is hard to reverse.

## 1. System context

```
            ┌──────────────┐  HTTPS/JSON   ┌───────────────┐   JDBC   ┌─────────────┐
 Browser ─▶ │ Angular SPA  │ ────────────▶ │ Spring Boot   │ ───────▶ │ PostgreSQL  │
            │ (static)     │  JWT bearer   │ REST API      │          │             │
            └──────────────┘               └───────┬───────┘          └─────────────┘
                                                   │ HTTPS
                                                   ▼
                                            ┌─────────────┐
                                            │ Resend      │  transactional email
                                            └─────────────┘
```

| Part | Hosting (production, #107) | Address |
|---|---|---|
| SPA | Cloudflare Pages, free plan | `https://app.secret-match.app` |
| API | Heroku, Common Runtime, EU region, container stack: one Basic dyno (512 MB, never sleeps), image built from `backend/Dockerfile` by `heroku.yml` | `https://api.secret-match.app` |
| Database | Heroku Postgres Essential-0 (1 GB, 20 connections) | `DATABASE_URL`, set by Heroku |
| Email | Resend, free plan (3,000 a month, 100 a day) | from `no-reply@secret-match.app` |
| Notifications on devices | The browsers' own push services (Google FCM, Mozilla, Apple, Microsoft) through Web Push, free | VAPID key pair in `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` |

DNS is on Cloudflare. The `api` record is DNS-only (not proxied), so the Heroku router is the only proxy in front of the API; Heroku's Automated Certificate Management serves its TLS certificate. SPA and API share one registrable domain, so the refresh cookie is first-party.

Constraints: fewer than 100 users, €0 out of pocket. The Heroku dyno ($7/month) and database ($5/month) are paid from the GitHub Student Pack credit ($13/month), so the API does not sleep and has no cold start. Cost guardrails that must stay true:

- Exactly one Basic web dyno: no second dyno, no Performance or Eco dynos. The in-memory rate limits (ADR 0006) also assume one instance.
- No paid third-party add-ons (the Student credit does not cover them).
- Heroku resources are created only once the Student credit shows in Billing.
- Domain auto-renew off, and a reminder before the Student credit runs out. Pausing is `heroku ps:scale web=0`.

**Running on Heroku** (#108):

- The API listens on `$PORT` (Heroku assigns it and stops a web dyno that has not bound to it within 60 s), and on 8080 when `PORT` is unset.
- In `prod`, `DATABASE_URL` may be Heroku's `postgres://user:password@host:port/db`. `shared.infrastructure.persistence.HerokuDatabaseUrl`, an `EnvironmentPostProcessor`, turns it into the JDBC URL (with `sslmode=require`), username and password at every start, so credentials Heroku rotates are picked up on the restart Heroku does after rotating them. A JDBC `DATABASE_URL`, and every other profile, are left alone. The Hikari pool is capped at 5 connections.
- The JVM is sized for 512 MB through `JAVA_TOOL_OPTIONS` in `backend/Dockerfile` (explicit heap, smaller thread stacks, serial GC, C1 only); a config var of the same name replaces it.
- No release phase: Flyway migrates at startup. Deploys come from Heroku's GitHub integration on `main`, with "wait for CI".

## 2. Backend

### 2.1 Style: modular monolith with ports and adapters

One deployable Spring Boot app, split into **modules** along domain lines. Each module has three layers:

```
com.secretmatch.<module>
├── domain          # entities, aggregates, value objects, domain services. Plain Java.
├── application     # use cases (transaction boundary), ports (interfaces) for outside systems
└── infrastructure  # adapters: web (controllers, DTOs), persistence (JPA), email, security
```

Dependency rule (enforced by an ArchUnit test):

```
infrastructure ──▶ application ──▶ domain
```

- `domain` depends on nothing outside the JDK.
- A module uses another module only through that module's `application` API, never its repositories or JPA entities. The one exception is `shared.domain` (e.g. `DomainException`), which any module may use.
- **Reading another module through a port of your own.** When a module's use cases need another module's data, it may declare a port in its own `application` package, in its own language, with an adapter in its `infrastructure` that calls the other module's `application` API. Example: `draw.application.Rosters` returns a Group's Roster (its Admin and Members), and `draw.infrastructure.GroupRosters` reads it through `group.application.MyGroups.findGroup`. The port keeps the other module's types out of the use cases and lets them be unit-tested with an in-memory fake. Like ports to external systems, it is a deliberate exception to "no interface with a single implementation". Chosen in #27. The same port carries the Draw's few writes into the Groups module: `Rosters.lockedOf` locks the Group (`MyGroups.lockGroup`) before a change that depends on who is in it, and `Rosters.markDrawn` records that the Draw is made (`MyGroups.markDrawn`), which freezes the Group's membership and Exclusions (ADR 0001). Joining and leaving take the same lock, so a Draw and a membership change never interleave. Chosen in #29. Cancelling the Draw takes the same lock and undoes it with `Rosters.markDrawCancelled` (`MyGroups.markDrawCancelled`), which unfreezes them again (#31). The Wishlist module has a `wishlist.application.Rosters` of its own (Members, and whether the Group is finished, which makes every Wishlist read-only), read the same way (#34). Likewise `wishlist.application.Receivers` tells the Wishlist module whose Wishlist a Giver may read, through `draw.application.GroupDraw.findMyReceiver` (ADR 0004). And `mailbox.application.Assignments` gives the Mailbox module a Member's Receiver and Giver, through `GroupDraw.findMyReceiver` and `GroupDraw.findMyGiver`; the Giver is only used to route Messages to the right Mailbox and never appears in a response, log, email or error (ADR 0001). `findMyGiver` is the only lookup of an Assignment by its Receiver, and the Mailbox module is its only caller. A Mailbox belongs to its Draw (`mailboxes.group_id` references `draws` with `ON DELETE CASCADE`), so cancelling a Draw takes its Mailboxes and Messages along. Chosen in #36.

### 2.2 Modules (initial cut)

| Module | Responsibility |
|---|---|
| `identity` | Accounts, registration/login, password hashing, JWT issuing |
| `group` | Groups, membership, the Admin role, Invite Links |
| `wishlist` | Wish items, personal preferences, the "please don't" list |
| `draw` | Exclusions, the draw engine, assignments and their lifecycle |
| `mailbox` | Anonymous giver→receiver questions and answers |
| `notification` | Email delivery: the shared template, in Spanish and English, and sending (Resend adapter). Notifications on devices (Web Push): each User's push subscriptions, one per device, and sending them. The module that triggers an email or a push writes its text (ADR 0003) |
| `shared` | Truly cross-cutting bits only (typed id base, error model, clock config) |

The module list is a starting point. Grilling and specs may merge or split modules, and if they do, update this table.

### 2.3 Draw engine

- A **pure domain service** in `draw.domain`: Members + Exclusions + a random source in, a complete set of Assignments (or a "no valid Draw exists" result) out. No I/O, no Spring.
- Approach: randomised backtracking (Fisher–Yates shuffled candidate order) over a constraint graph, with pruning. The details belong to the draw spec.
- Determinism: the random source is injected, so a fixed seed reproduces a draw in tests.
- Running a draw and persisting its assignments happen in one transaction. A group cannot end up half-drawn.

### 2.4 Security

- Stateless authentication with JWT bearer tokens. Spring Security resource-server style; no server sessions.
- Passwords hashed with BCrypt (or Argon2).
- **Sign-in methods: email + password, and Google.** Google uses the ID-token flow: the SPA gets an ID token from Google Identity Services and posts it to the API, which verifies it against Google's public keys and issues our own access/refresh tokens. No server-side OAuth redirect or session. The API checks the signature (RS256, Google's published JWK set), the issuer, the audience (our client id), the expiry and `email_verified`. The link stores the Google account's `sub`, so a User whose Google email changes still signs in to the same User; another Google account cannot take over a User already linked. The client id comes from `GOOGLE_CLIENT_ID` (API and SPA runtime config); without it Google sign-in is off.
- A User is identified by a unique email and may have a password, a Google link, or both. Signing in with Google links automatically to an existing User with the same email. Password registration requires email verification, so nobody can pre-claim someone else's email before they sign in with Google.
- Authorisation is per group: being authenticated is not enough, the use case checks membership/role.
- CORS allows only the SPA origin.
- **Tokens: short-lived access token + refresh token.**
  - Access token: JWT, ~15 min lifetime, sent as `Authorization: Bearer`, kept in memory by the SPA (not in `localStorage`).
  - Refresh token: opaque random value, ~30 days, delivered in an `HttpOnly`, `Secure` cookie scoped to the session endpoints (`/api/v1/sessions`: refresh and sign-out). Stored **hashed** in the database so it can be revoked (logout, password change, Password Reset). Every refresh token belongs to one session (the token family started by one sign-in); signing out revokes that session only, a password change every other one, and a Password Reset all of them.
  - Endpoints: `POST /api/v1/sessions` (sign in), `POST /api/v1/sessions/google` (sign in with a Google ID token), `POST /api/v1/sessions/refresh`, `DELETE /api/v1/sessions/current` (sign out). A request without a valid access token gets a `401` problem (`urn:secretmatch:problem:unauthenticated`); a refresh that fails is the `session-expired` domain problem.
  - The JWT is signed with HS256 using `JWT_SIGNING_KEY` (Base64, at least 256 bits). The API issues and checks its own tokens, so no key pair or external issuer is needed.
  - Rotation: every refresh issues a new refresh token and invalidates the old one. Reuse of an invalidated token revokes the whole token family. Exception: for 10 seconds after a rotation, the old token still gets an access token, with no new cookie. That covers two tabs reloading at once with the same cookie, since the browser already holds the new one. After those 10 seconds it counts as a reuse.
  - A refresh or sign-out sent from any origin other than the SPA is refused with `403` by the CORS processing, before it reaches the API. Another site cannot rotate or end a session through the browser's cookie.
  - The cookie is `SameSite=None`, from when the SPA and API lived on unrelated domains. In production they now share one registrable domain (section 1), which would allow `SameSite=Lax`/`Strict` later.

### 2.5 Cross-cutting

- **Errors**: domain exceptions → `@RestControllerAdvice` → RFC 9457 `ProblemDetail`: `422`, or `404` for a `shared.domain.NotFoundException` (something the caller may not know exists, such as a Group to a non-Member).
- **Migrations**: Flyway, versioned SQL in `backend/src/main/resources/db/migration`.
- **Config**: Spring profiles (`local`, `test`, `prod`) and environment variables for every secret and URL. `prod` refuses to start when `JWT_SIGNING_KEY` is the public local placeholder from `.env.example` (#101).
- **Logging in `prod`**: the loggers that can print a request's headers, cookies or body (Spring Security, Spring web, the embedded Tomcat) are pinned to `INFO` in `application-prod.yml`, so a stray DEBUG or TRACE on a parent logger (root, `org.springframework`, `org.apache`) cannot leak an access token, a refresh cookie or a password (#101).
- **Time**: all instants stored and transported in UTC. A `Clock` bean is injected where time matters.
- **API docs**: springdoc OpenAPI at `/v3/api-docs` (Swagger UI only outside `prod`).
- **Email delivery: sent after the transaction commits, off the request thread.** The use case publishes an application event and a `@TransactionalEventListener(phase = AFTER_COMMIT)` hands it to the `notification` port on a dedicated executor (`@Async`). An email is therefore never sent for a change that rolled back, and the HTTP response never waits for one. That is about anonymity, not only speed: an answer that waits for the provider would be measurably slower exactly when an email goes out, so asking for a password reset or signing up would tell whether an email has a User (#96). The executor is bounded (2 threads, a queue of 100); when the queue is full a new email is dropped and logged like a failed send, never run on the request thread. On graceful shutdown the app waits up to 10 seconds for queued emails. A failed send is logged (without personal data) and does **not** fail or undo the business action. There are no automatic retries; an outbox table is the upgrade path if that becomes a problem. The `EmailSender` port is backed by Resend in `prod` and by a local mail catcher (Mailpit, in the compose stack) in every other profile, so nothing is really delivered outside `prod`. See 2.6 for how to add an email.
- **Notifications on devices (Web Push, #119) go the same way as emails.** Next to its `EmailRequested`, a use case publishes `notification.application.PushRequested(recipient userId, title, body, linkPath, thread, urgency)`, with the text already written in the recipient's Language. `PushDelivery` sends it after the commit, on the email executor, to every push subscription of that User; a failure is logged without personal data, and a subscription the push service answers 404 or 410 for is deleted. Today two moments push: a new Message (to the other side of the Mailbox, the same words both ways) and the Draw made (to every Member). The text shows on a lock screen: never a Message's text or anything that tells a Receiver who their Giver is. `thread` (e.g. one Mailbox and side) leaves the API only hashed, as the push's `Topic` and the notification's `tag`, so a newer push on the same thread replaces the older on the device. The `PushSender` port is backed by `WebPushSender` (RFC 8291 encryption and RFC 8292 VAPID, with the JDK's own crypto, no library) when the VAPID keys are set, required in `prod`; elsewhere, without keys, pushing is off and a push is only logged. Subscriptions (`push_subscriptions`) are unique per endpoint: subscribing an endpoint again moves it to the signed-in User, since the browser on that device is theirs now; they go with the User (`ON DELETE CASCADE`). The API only posts to endpoints of the browsers' push services over HTTPS (`notification.domain.PushSubscription`), never to a URL a caller picks.
- **When a membership ends, other modules clean up through an event.** Leaving a Group or being removed from it publishes `group.application.MembershipEnded(groupId, memberId)` inside the use case's transaction. A module that keeps data per Member of a Group (the Draw module's Exclusions, the Wishlist module's Wishlist) deletes it from a plain `@EventListener`, which runs in that same transaction: if the cleanup fails, the Member stays in the Group. `group` therefore depends on none of those modules. Deleting a Group works the same way with `group.application.GroupDeleted(groupId)`, published before the Group's rows are deleted: every module that keeps data in a Group (Exclusions, the Draw, Wishlists, Mailboxes) deletes all of it from a plain `@EventListener`. Cancelling a Draw works the same way with `draw.application.DrawCancelled(groupId)`, published inside the transaction that deletes its Assignments: a module that keeps data tied to that Draw deletes it from a plain `@EventListener` (the Mailbox module deletes the Group's Mailboxes and their Messages there, #36).
- **Deleting a User's account goes the same way, in two steps** (`identity.application.Profile.deleteAccount`, #19). First `UserDeletionRequested(userId)`: a module that must refuse throws a `DomainException` from its listener and changes nothing (the Draw module, while the User is in a Group whose Draw is made and whose Exchange Date has not passed). Then `UserDeleted(userId)`, before the User's row goes: the Groups module deletes the Groups they are the Admin of (with `GroupDeleted` and its emails) and ends their other memberships (with `MembershipEnded`), finished Groups included; the Draw module deletes their remaining Assignments; the Mailbox module deletes the Mailboxes where they are the Receiver, with their Messages, and keeps those where they are the Giver but forgets who that Giver was and who wrote their Messages (`giver_id` and `author_id` become `NULL`): their Receiver keeps the same "Chat misterioso" as before, because a Mailbox disappearing just as a Member leaves the Group would tell the Receiver who their Giver was (ADR 0001). Their refresh tokens and Password Reset go with the row (`ON DELETE CASCADE`), so every Session ends. Two events rather than one with ordered listeners, so no refusal can come after another module already deleted something. `identity` therefore depends on none of those modules.
- **No scheduled jobs in the MVP.** Time-triggered emails (e.g. an Exchange Date reminder) are deferred: no ticket needs them yet. The Basic dyno no longer sleeps, but Heroku restarts every dyno at least once a day and on every deploy, and the app may be paused with `heroku ps:scale web=0`, so an in-process scheduler (`@Scheduled`, Quartz) still cannot assume it is running at a given moment. Upgrade path: a daily `@Scheduled` job that is idempotent (sends what is due and not yet sent, also on startup).
- **Rate limiting** of the signed-out identity endpoints (ADR 0006), in memory with Bucket4j: per client IP, answered with `429` and `Retry-After` (the IP is the one the Heroku router appends to `X-Forwarded-For`, never an entry the client sent); per email, silently, in the use cases through `identity.application.LinkEmailLimits`; and a daily cap on Verification and Password Reset emails only. Limits are properties under `secretmatch.rate-limit`.
- **Language**: the UI and every email exist in Spanish and English (ADR 0005). The SPA resolves its Language before bootstrap and reloads to switch it; a User has a Language, saved from the Preferences menu and applied on sign-in; each email goes out in its recipient's Language. Code, docs and API identifiers stay in English.

### 2.6 Adding an email

Every email in the catalogue (#6) goes through the same path. The module that triggers it writes the text, and `notification` owns the layout and the sending (ADR 0003).

1. **Publish from the use case, inside its transaction.** Inject `ApplicationEventPublisher` and publish a `notification.application.EmailRequested(recipient, language, subject, message, linkPath)` from the `@Transactional` use case method. It goes out only after the commit, and off the request thread, so the response never waits for it (2.5: how long an answer takes must not tell whether an email has a User). Published outside a transaction it is handed to the email executor right away, because nothing can roll back.
2. **Write the text in both Languages, plain text only, and pick the recipient's** (ADR 0005). Read the recipient's address and `shared.domain.Language` together, through the port that gives you the address (`identity.application.UserDirectory.recipientOf`, or a port of your own such as `mailbox.application.MemberEmails`), and write the text in a method that `switch`es over the Language and returns a `notification.application.EmailText(subject, message)`. The `EmailRequested` is then built once, with the recipient's address, their Language, that text and the link: `new EmailRequested(to.email(), to.language(), text, linkPath)`. An email to several people is written once per recipient, each in theirs. English copy uses the `GLOSSARY.md` terms as they are. `subject` and `message` are plain text: a blank line separates paragraphs, and the template escapes everything. Do not add a greeting from a person, a signature or a call-to-action button: the base template already adds the SecretMatch sender, an "Abrir SecretMatch" / "Open SecretMatch" link and a footer, in the email's Language. `linkPath` is a path inside the SPA (e.g. `/groups/{groupId}`), never a full URL.
3. **Check anonymity, in both Languages.** An email to a Receiver must not reveal the Giver: no name, email or anything that could identify them, not even in the subject (section 4 of `docs/verification.md`).
4. **Never log emails.** Do not log the event, the recipient or the text. `EmailRequested` and `OutgoingEmail` print as `[redacted]`. Adapters report failures only as `EmailDeliveryException` with a message that is safe to log (e.g. the HTTP status).
5. **Test it.**
   - In the use case's integration test, replace `EmailSender` with `RecordingEmailSender` (import its `Config`) and assert the recipient and subject, for a Spanish and an English recipient. Its `sent()` and `sentTo()` first wait until no email is queued or being sent, so read the emails through them, never with a sleep.
   - For a Receiver-facing email, also assert that the Giver's identity is absent.
   - In the running stack, check the email in Mailpit (http://localhost:8025).

## 3. Frontend

```
frontend/src/app
├── core/            # app-wide singletons: auth service, HTTP interceptors, guards, error handling
├── shared/          # reusable presentational components, pipes, UI primitives
└── features/
    └── <feature>/   # e.g. auth, groups, wishlist, draw, reveal, mailbox
        ├── pages/        # routed components, orchestrate state
        ├── components/   # presentational components
        └── data-access/  # API client + types + feature state (signals)
```

- **Runtime config**: the SPA reads `/config.json` (`apiBaseUrl`) before bootstrapping, so one build works against any API origin. `public/config.json` serves `ng serve`; the Docker image rewrites it from `API_BASE_URL` at container start; a static host writes it in its build step. The service worker never caches it; the SPA remembers the last one it read and uses it only when the network cannot be reached, so the installed app starts offline.
- **Installable app (PWA)**: production builds ship a manifest and Angular's service worker, which caches the app shell and bundles only: never API responses (private to one User) nor `config.json`. `core/updates/AppUpdates` moves the app to a new deploy on the next navigation. Details in `frontend/CLAUDE.md`.
- Routes are lazy-loaded per feature.
- An HTTP interceptor attaches the JWT. Route guards protect authenticated and admin-only pages.
- The session lives in `core/auth` (`AuthSession`): the access token stays in a signal in memory. After a reload the guard restores it with one silent refresh. On a `401` the interceptor refreshes once and retries the request, and if that fails it sends the User to `/sign-in`. Concurrent refreshes share one request, because the API treats a second refresh with an already rotated cookie as a reuse.
- Feature state lives in signal-based services in `data-access`. There is no global store library unless a spec proves the need.
- The visual design is defined in `DESIGN.md`; its tokens live in Tailwind's `@theme` in `frontend/src/styles.css`. New screens are designed with the human first (the `design` skill).
- **Theme** (ADR 0005): System, Light or Dark, per device. `core/preferences/ThemePreference` keeps it in `localStorage` and puts a forced one on `<html>` as `data-theme`; an inline script in `index.html` does the same before Angular starts, so it never flashes. `styles.css` switches the token values on it, so templates carry no `dark:` colour variants. Both layouts (`app-shell`, `app-sheet-layout`) carry the Preferences menu in their header, so it is on every screen. Being app chrome rather than part of one feature, the menu lives in `shared/ui` and is the one shared component that injects services and reaches the API (through `LanguagePreference`, to save a signed-in User's Language); every other `shared/` component stays presentational (CODING_STANDARDS.md section 3).
- **API calls go through a client generated from the OpenAPI document**, never written by hand. The contract is `backend/openapi.json`, a committed snapshot of `/v3/api-docs` that a backend integration test keeps identical to what the API serves. `npm run api:generate` (ng-openapi-gen) turns it into `src/app/core/api/generated`, which is committed and never edited manually. Feature `data-access` services wrap it. Regenerating after an API change (snapshot and client) is part of the same ticket, and CI fails if the committed client is out of date with the snapshot.
- Actuator's `/actuator/health` is part of the OpenAPI document too (`springdoc.show-actuator`), with its response narrowed to `{ status }`, so even the health check uses the generated client.

## 4. Repository and delivery

```
secret-match/
├── backend/            # Maven project, multi-stage Dockerfile
├── frontend/           # Angular workspace
├── docs/               # architecture, verification, ADRs, agent config
├── docker-compose.yml  # local stack: postgres, mailpit (+ backend + frontend)
└── .github/workflows/  # CI per area, path-filtered
```

- CI runs the checks in `docs/verification.md` on every PR, only for the areas the PR touches.
- `main` is always deployable. Deploys are triggered from `main`: Heroku's GitHub integration builds the API image (`heroku.yml`) once CI passes; Cloudflare Pages builds the SPA.
