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

| Part | Hosting (free tier) |
|---|---|
| SPA | Cloudflare Pages (or Vercel) |
| API | Docker image on Render (or Koyeb) |
| Database | Neon (or Supabase) PostgreSQL |
| Email | Resend |

Constraints: fewer than 100 users, €0 infrastructure. Free hosts sleep when idle, so the first request after a pause can be slow. That is accepted, not engineered around.

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
- **Reading another module through a port of your own.** When a module's use cases need another module's data, it may declare a port in its own `application` package, in its own language, with an adapter in its `infrastructure` that calls the other module's `application` API. Example: `draw.application.Rosters` returns a Group's Roster (its Admin and Members), and `draw.infrastructure.GroupRosters` reads it through `group.application.MyGroups.findGroup`. The port keeps the other module's types out of the use cases and lets them be unit-tested with an in-memory fake. Like ports to external systems, it is a deliberate exception to "no interface with a single implementation". Chosen in #27. Likewise `wishlist.application.Receivers` tells the Wishlist module whose Wishlist a Giver may read, through `draw.application.GroupDraw.findMyReceiver` (ADR 0004).

### 2.2 Modules (initial cut)

| Module | Responsibility |
|---|---|
| `identity` | Accounts, registration/login, password hashing, JWT issuing |
| `group` | Groups, membership, the Admin role, Invite Links |
| `wishlist` | Wish items, personal preferences, the "please don't" list |
| `draw` | Exclusions, the draw engine, assignments and their lifecycle |
| `mailbox` | Anonymous giver→receiver questions and answers |
| `notification` | Email delivery: the shared Spanish template and sending (Resend adapter). The module that triggers an email writes its text (ADR 0003) |
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
  - The SPA and API live on different domains on the free hosts, so the cookie needs `SameSite=None`. A custom domain shared by both would allow `SameSite=Lax`/`Strict` later.

### 2.5 Cross-cutting

- **Errors**: domain exceptions → `@RestControllerAdvice` → RFC 9457 `ProblemDetail`: `422`, or `404` for a `shared.domain.NotFoundException` (something the caller may not know exists, such as a Group to a non-Member).
- **Migrations**: Flyway, versioned SQL in `backend/src/main/resources/db/migration`.
- **Config**: Spring profiles (`local`, `test`, `prod`) and environment variables for every secret and URL.
- **Time**: all instants stored and transported in UTC. A `Clock` bean is injected where time matters.
- **API docs**: springdoc OpenAPI at `/v3/api-docs` (Swagger UI only outside `prod`).
- **Email delivery: sent within the request, after the transaction commits.** The use case publishes an application event and a `@TransactionalEventListener(phase = AFTER_COMMIT)` calls the `notification` port. An email is therefore never sent for a change that rolled back. A failed send is logged (without personal data) and does **not** fail or undo the business action. There are no automatic retries; an outbox table is the upgrade path if that becomes a problem. The `EmailSender` port is backed by Resend in `prod` and by a local mail catcher (Mailpit, in the compose stack) in every other profile, so nothing is really delivered outside `prod`. See 2.6 for how to add an email.
- **When a membership ends, other modules clean up through an event.** Leaving a Group or being removed from it publishes `group.application.MembershipEnded(groupId, memberId)` inside the use case's transaction. A module that keeps data per Member of a Group (the Draw module's Exclusions, the Wishlist module's Wishlist) deletes it from a plain `@EventListener`, which runs in that same transaction: if the cleanup fails, the Member stays in the Group. `group` therefore depends on none of those modules. Deleting a Group works the same way with `group.application.GroupDeleted(groupId)`, published before the Group's rows are deleted: every module that keeps data in a Group (Exclusions, the Draw, Wishlists, Mailboxes) deletes all of it from a plain `@EventListener`.
- **No scheduled jobs in the MVP.** The free host sleeps when idle, so an in-process scheduler (`@Scheduled`, Quartz) cannot be trusted to fire on time. Time-triggered emails (e.g. an Exchange Date reminder) are deferred. Upgrade path: a daily `@Scheduled` job that is idempotent (sends what is due and not yet sent, also on startup) plus an external scheduled ping (e.g. GitHub Actions) to wake the API.
- **Language**: the UI and all emails are in Spanish only for the MVP. Code, docs and API identifiers stay in English.

### 2.6 Adding an email

Every email in the catalogue (#6) goes through the same path. The module that triggers it writes the text, and `notification` owns the layout and the sending (ADR 0003).

1. **Publish from the use case, inside its transaction.** Inject `ApplicationEventPublisher` and publish a `notification.application.EmailRequested(recipient, subject, message, linkPath)` from the `@Transactional` use case method. It goes out only after the commit. Published outside a transaction it is sent right away, because nothing can roll back.
2. **Write the text in Spanish, plain text only.** `subject` and `message` are plain text: a blank line separates paragraphs, and the template escapes everything. Do not add a greeting from a person, a signature or a call-to-action button: the base template already adds the SecretMatch sender, an "Abrir SecretMatch" link and a footer. `linkPath` is a path inside the SPA (e.g. `/groups/{groupId}`), never a full URL.
3. **Check anonymity.** An email to a Receiver must not reveal the Giver: no name, email or anything that could identify them, not even in the subject (section 4 of `docs/verification.md`).
4. **Never log emails.** Do not log the event, the recipient or the text. `EmailRequested` and `OutgoingEmail` print as `[redacted]`. Adapters report failures only as `EmailDeliveryException` with a message that is safe to log (e.g. the HTTP status).
5. **Test it.**
   - In the use case's integration test, replace `EmailSender` with a recording fake (see `EmailDeliveryIT`) and assert the recipient and subject.
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

- **Runtime config**: the SPA reads `/config.json` (`apiBaseUrl`) before bootstrapping, so one build works against any API origin. `public/config.json` serves `ng serve`; the Docker image rewrites it from `API_BASE_URL` at container start; a static host writes it in its build step.
- Routes are lazy-loaded per feature.
- An HTTP interceptor attaches the JWT. Route guards protect authenticated and admin-only pages.
- The session lives in `core/auth` (`AuthSession`): the access token stays in a signal in memory. After a reload the guard restores it with one silent refresh. On a `401` the interceptor refreshes once and retries the request, and if that fails it sends the User to `/sign-in`. Concurrent refreshes share one request, because the API treats a second refresh with an already rotated cookie as a reuse.
- Feature state lives in signal-based services in `data-access`. There is no global store library unless a spec proves the need.
- The visual design is defined in `DESIGN.md`; its tokens live in Tailwind's `@theme` in `frontend/src/styles.css`. New screens are designed with the human first (the `design` skill).
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
- `main` is always deployable. Deploys are triggered from `main`.
