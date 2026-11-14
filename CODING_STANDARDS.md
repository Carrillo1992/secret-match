# Coding Standards

Rules that need judgement. Anything a formatter or linter enforces (layout, import order, quotes) lives in tooling, not here: Spotless for Java, ESLint + Prettier for TypeScript.

A rule here overrides a generic best practice. To change a rule, change this file in its own PR.

---

## 1. General

- **Domain language first.** Class, method, test and endpoint names use the terms in `GLOSSARY.md`. A missing term means a glossary gap, not permission to invent a synonym.
- **Deep modules, small interfaces.** Prefer one module that hides a lot behind a narrow API over many shallow pass-through layers.
- **No speculative generality.** No interfaces with a single implementation "for later", no config flags nobody sets, no generic frameworks for one use case. Exception: ports to external systems and to other modules (see 2.1).
- **Validate at the boundaries, trust inside.** Input is validated where it enters (HTTP, messages, config). Domain objects cannot be built in an invalid state.
- **Fail loudly.** No swallowed exceptions, no `catch (Exception e) {}`, no `null` returned to mean "error".
- **Anonymity invariant.** No giver identity in any receiver-facing output: DTOs, emails, logs, exception messages, URLs. Logs never contain message bodies, wishlist contents, emails or tokens.
- **Time and randomness are dependencies.** Code that reads the clock or draws random numbers receives a `Clock` / random generator, so tests are deterministic.

## 2. Backend (Java 21 / Spring Boot 4)

### 2.1 Structure

- Package by **module** first (`draw`, `group`, `wishlist`…), then by layer inside it: `domain`, `application`, `infrastructure`. See `docs/architecture.md`.
- `domain` has **no** Spring, JPA, Jackson or Jakarta imports. Plain Java only.
- Each external system (database, Resend, JWT provider) sits behind a **port** (an interface in `application`) with an **adapter** in `infrastructure`.
- A module whose use cases need another module's data may read it through a port of its own, in its own language, whose adapter calls the other module's `application` API (e.g. `draw.application.Rosters` → `GroupRosters` → `group.application.MyGroups`). See `docs/architecture.md` §2.1.
- JPA entities are **not** domain objects. They live in `infrastructure.persistence` and are mapped explicitly to and from the domain.

### 2.2 Java style

- **Records** for value objects, DTOs, commands and query results.
- **No Lombok.** Records and IDE generation cover what we need, and the code stays explicit.
- Immutable by default: `final` fields, `List.copyOf`, no setters on domain objects. State changes go through intention-revealing methods (`group.launchDraw(...)`, not `group.setStatus(...)`).
- `Optional` only as a return type, never as a field or parameter.
- Prefer `sealed` types + pattern-matching `switch` over `instanceof` chains or status-flag `if` cascades.
- Identifiers are typed value objects (`GroupId`, `MemberId`) wrapping a `UUID`, not raw `UUID`/`Long` in domain signatures.

### 2.3 Application and web layer

- One **use case** = one application service method with a clear command/query in and result out. Transactions (`@Transactional`) live here, not in controllers or the domain.
- Controllers are thin: map request DTO → command, call the use case, map result → response DTO. No business logic, never return entities.
- Request DTOs are validated with Jakarta Validation (`@Valid`, `@NotBlank`…).
  Exception: a request whose access check must come first (the Mailbox's `SendMessageRequest`) is validated in the domain instead, after that check, so an outsider gets a 404, never a 400 or 422 that confirms the resource exists.
- Errors: domain exceptions are translated in one `@RestControllerAdvice` into RFC 9457 `ProblemDetail` responses. No stack traces in responses. A domain exception extends `shared.domain.DomainException` with a kebab-case `code`; it is answered as `422` with `type` `urn:secretmatch:problem:<code>` and its message as `detail`, so the message must be safe to show (anonymity invariant). A domain exception that extends `shared.domain.NotFoundException` is answered as `404` instead: use it for something the caller may not know exists, so "does not exist" and "not yours" look the same (e.g. a Group to a non-Member). Any other exception is answered as a `500` problem with a generic `detail` and logged in full.
- Authorisation checks ("is this user an admin of this group?") happen in the application layer, not only in the controller.

### 2.4 Persistence

- Schema changes only through versioned migrations (Flyway). Never `ddl-auto=update` outside throwaway local experiments.
- Constraints that protect invariants (uniqueness, foreign keys, not-null) exist in the database too, not only in Java.
- Watch for N+1 queries: fetch what a use case needs explicitly.

## 3. Frontend (Angular / Tailwind)

- **Standalone components only**, no NgModules. `ChangeDetectionStrategy.OnPush` everywhere.
- **Signals** for component and feature state (`signal`, `computed`, `input()`, `output()`). RxJS only where streams genuinely help (HTTP, debounced input), converted at the edge with `toSignal`.
- `inject()` instead of constructor injection. Built-in control flow (`@if`, `@for` with `track`), not structural directives.
- Strict TypeScript: no `any`, no non-null `!` to silence the compiler. API types live in one place per feature (`data-access`).
- Feature folders: `features/<feature>/{pages,components,data-access}`. Pages orchestrate, components are presentational (inputs in, outputs out, no HTTP). Exception: a component that is one self-contained sign-in method, used as-is on several doorway screens (today `features/auth/components/google-sign-in`), may open the session through `AuthSession` and emit only `signedIn`, so each page does not repeat its error states.
- Typed reactive forms. Validation messages are shown next to the field.
- Styling: Tailwind utilities using the design tokens in `@theme` (`frontend/src/styles.css`), following `DESIGN.md`. No hard-coded colours or arbitrary values when a token exists, and no component CSS unless Tailwind cannot express it (e.g. canvas).
- **Accessibility is part of done**: semantic HTML, labelled controls, visible focus, keyboard access. Animations (scratch card, gift reveal) respect `prefers-reduced-motion` and have a non-gesture alternative (a button).

## 4. Testing

- Test **behaviour at agreed seams** (public interfaces), not implementation details. A refactor that keeps behaviour must not break tests.
- **Backend**: JUnit 5 + AssertJ. Domain and draw engine get fast pure unit tests, with no Spring context. Use cases and persistence get integration tests against real PostgreSQL via Testcontainers. Mock or fake only ports, to external systems (e.g. the email sender) or to other modules (e.g. an in-memory `Rosters` in a use case's unit test), never domain objects.
- Test names describe behaviour: `@DisplayName("assigns nobody to themselves")` or `assignsNobodyToThemselves()`.
- Expected values come from an independent source (literal, worked example, spec), never recomputed the way the production code does.
- **Draw engine**: besides example-based tests, run invariant checks over many seeds and generated groups (no self-assignment, every Member gives and receives exactly once, all Exclusions respected, no reciprocal pairs, impossible configurations reported as such).
- **Frontend**: component tests for behaviour that matters to users (form validation, reveal flow, guards). No snapshot tests of whole templates.

## 5. API conventions

- REST under `/api/v1`. Plural, kebab-case resource names (`/groups/{groupId}/wishlist-items`).
- JSON fields in `camelCase`. Dates as ISO-8601 UTC.
- Errors as `ProblemDetail` (RFC 9457) with a stable `type` URI per error kind.
- The OpenAPI document (springdoc) is generated from code and is the contract the frontend follows.
