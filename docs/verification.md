# Verification Guide

How to prove a ticket is done. Every implementer, human or agent, runs these checks **before** declaring a ticket done or opening a PR, and reports the result in the PR.

> Commands marked ⏳ become available once the corresponding scaffolding ticket lands. Until then, skip them and say so in the PR.

## 1. Definition of Done

A ticket is done when **all** of these are true:

- [ ] Every acceptance criterion in the ticket is met, and each one is covered by a test or a manual check listed in the PR.
- [ ] The automated checks for every area the change touches pass locally (section 2).
- [ ] New behaviour has tests at the seams agreed in the spec. Bug fixes start with a failing test that reproduces the bug.
- [ ] Schema changes come as a new Flyway migration. Existing migrations are never edited.
- [ ] No secrets, no debug leftovers (`System.out`, `console.log`, commented-out code, stray TODOs without an issue number).
- [ ] The anonymity invariant still holds (section 4).
- [ ] UI changes were checked in the running app (section 3).
- [ ] Docs updated if the change alters architecture, standards, commands or domain terms (`docs/architecture.md`, `CODING_STANDARDS.md`, this file, `GLOSSARY.md`, an ADR).
- [ ] The PR body says `Closes #<n>` and lists what was verified and how.

## 2. Automated checks

### Backend

Run from `backend/` with a JDK 21 as `JAVA_HOME` (`./mvnw spotless:apply` fixes formatting):

| Command | What it covers |
|---|---|
| `./mvnw spotless:check` | Formatting |
| `./mvnw verify` | Compile, unit tests, integration tests (Testcontainers PostgreSQL: Docker must be running), ArchUnit layer rules, coverage report |

`./mvnw verify` also fails when `backend/openapi.json` no longer matches the OpenAPI document the API serves. After an intended API change, refresh it with `./mvnw verify -Dopenapi.snapshot.update=true`, then run `npm run api:generate` in `frontend/` and commit both.

### Coverage floors

The build fails below these floors: JaCoCo `check` goal in the backend, the test runner's coverage thresholds in the frontend.

| Scope | Minimum line coverage |
|---|---|
| Backend, overall | 80 % |
| Backend, `draw.domain` | 90 % |
| Frontend, overall | 80 % |

Excluded from measurement, because testing them adds no confidence: the application `main` class, Spring `@Configuration` classes, plain DTOs/records without logic, the generated API client, and frontend bootstrap files (`main.ts`, `app.config.ts`).

In the backend the exclusions are by class name (see the JaCoCo plugin in `backend/pom.xml`): `SecretMatchApplication`, `*Configuration`, and web DTOs named `*Request` / `*Response`. Name classes accordingly, and keep logic out of anything that matches those patterns.

Coverage is a floor, not a goal. A test written only to raise the number (no meaningful assertion, or one that tests implementation details) is rejected in review.

### Frontend ⏳

Run from `frontend/`:

| Command | What it covers |
|---|---|
| `npm run lint` | ESLint (+ Prettier check) |
| `npm test -- --watch=false` | Unit and component tests |
| `npm run build` | Production build compiles with strict TypeScript |
| `npm run api:generate` + `git diff --exit-code src/app/core/api/generated` | Generated API client matches the committed OpenAPI snapshot `backend/openapi.json` |

### Whole stack

From the repo root: `docker compose up --build` starts PostgreSQL, the API and the SPA locally (SPA on http://localhost:4200, API on http://localhost:8080). Use it for manual and end-to-end checks. If a port is taken, override it in `.env` (`API_PORT`, `SPA_PORT`, `POSTGRES_PORT`; see `.env.example`).

## 3. Manual verification (UI and flows)

For any ticket with user-visible behaviour:

1. Start the stack and walk the ticket's main scenario end to end, as each role involved (Admin, Member).
2. Try the unhappy paths: invalid input, unauthorised access (another group's data, a Member doing Admin actions), expired or invalid invite link.
3. Check at **phone width (~375 px)** and desktop.
4. Keyboard-only pass: everything reachable and operable, focus visible.
5. For animations: turn on reduced motion in the OS and check that the alternative works.

Record in the PR what you checked. Screenshots or a short GIF are welcome for UI changes.

## 4. Anonymity checklist

For any change touching assignments, the mailbox, notifications or their APIs:

- [ ] Responses visible to a receiver contain no giver identifier (id, name, email, avatar) or anything that could be used to derive it.
- [ ] Emails to a receiver about a mailbox message do not reveal the sender.
- [ ] Logs and error messages contain no assignment pairs or message bodies.
- [ ] There is an automated test asserting the receiver-facing response shape for the changed endpoint.

## 5. Continuous integration ⏳

GitHub Actions runs the section 2 checks on every PR, filtered by path (`backend/**`, `frontend/**`). A PR is mergeable only when CI is green. Local verification is still required: CI confirms it, it does not replace it.
