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
- A module uses another module only through that module's `application` API, never its repositories or JPA entities.

### 2.2 Modules (initial cut)

| Module | Responsibility |
|---|---|
| `identity` | Accounts, registration/login, password hashing, JWT issuing |
| `group` | Groups, membership, roles (admin/participant), invitation codes |
| `wishlist` | Wish items, personal preferences, the "please don't" list |
| `draw` | Exclusions, the draw engine, assignments and their lifecycle |
| `mailbox` | Anonymous giver→receiver questions and answers |
| `notification` | Email composition and sending (Resend adapter) |
| `shared` | Truly cross-cutting bits only (typed id base, error model, clock config) |

The module list is a starting point. Grilling and specs may merge or split modules, and if they do, update this table.

### 2.3 Draw engine

- A **pure domain service** in `draw.domain`: participants + exclusion rules + a random source in, a complete assignment (or a "no valid assignment exists" result) out. No I/O, no Spring.
- Approach: randomised backtracking (Fisher–Yates shuffled candidate order) over a constraint graph, with pruning. The details belong to the draw spec.
- Determinism: the random source is injected, so a fixed seed reproduces a draw in tests.
- Running a draw and persisting its assignments happen in one transaction. A group cannot end up half-drawn.

### 2.4 Security

- Stateless authentication with JWT bearer tokens. Spring Security resource-server style; no server sessions.
- Passwords hashed with BCrypt (or Argon2).
- Authorisation is per group: being authenticated is not enough, the use case checks membership/role.
- CORS allows only the SPA origin.
- **Tokens: short-lived access token + refresh token.**
  - Access token: JWT, ~15 min lifetime, sent as `Authorization: Bearer`, kept in memory by the SPA (not in `localStorage`).
  - Refresh token: opaque random value, ~30 days, delivered in an `HttpOnly`, `Secure` cookie scoped to the refresh endpoint. Stored **hashed** in the database so it can be revoked (logout, password change).
  - Rotation: every refresh issues a new refresh token and invalidates the old one. Reuse of an invalidated token revokes the whole token family.
  - The SPA and API live on different domains on the free hosts, so the cookie needs `SameSite=None`. A custom domain shared by both would allow `SameSite=Lax`/`Strict` later.

### 2.5 Cross-cutting

- **Errors**: domain exceptions → `@RestControllerAdvice` → RFC 9457 `ProblemDetail`.
- **Migrations**: Flyway, versioned SQL in `backend/src/main/resources/db/migration`.
- **Config**: Spring profiles (`local`, `test`, `prod`) and environment variables for every secret and URL.
- **Time**: all instants stored and transported in UTC. A `Clock` bean is injected where time matters.
- **API docs**: springdoc OpenAPI at `/v3/api-docs` (Swagger UI only outside `prod`).
- **Email delivery: sent within the request, after the transaction commits.** The use case publishes an application event and a `@TransactionalEventListener(phase = AFTER_COMMIT)` calls the `notification` port. An email is therefore never sent for a change that rolled back. A failed send is logged (without personal data) and does **not** fail or undo the business action. There are no automatic retries; an outbox table is the upgrade path if that becomes a problem.

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

- Routes are lazy-loaded per feature.
- An HTTP interceptor attaches the JWT. Route guards protect authenticated and admin-only pages.
- Feature state lives in signal-based services in `data-access`. There is no global store library unless a spec proves the need.
- The visual design comes from the design system (Claude Design). Its tokens are mirrored in the Tailwind config.
- **API types are generated from the OpenAPI document**, never written by hand. The generated code lives in one folder (e.g. `src/app/core/api/generated`), is committed, and is never edited manually. Feature `data-access` services wrap it. Regenerating after an API change is part of the same ticket, and CI fails if the committed client is out of date with the backend's spec.

## 4. Repository and delivery

```
secret-match/
├── backend/            # Maven project, multi-stage Dockerfile
├── frontend/           # Angular workspace
├── docs/               # architecture, verification, ADRs, agent config
├── docker-compose.yml  # local stack: postgres (+ backend + frontend)
└── .github/workflows/  # CI per area, path-filtered
```

- CI runs the checks in `docs/verification.md` on every PR, only for the areas the PR touches.
- `main` is always deployable. Deploys are triggered from `main`.
