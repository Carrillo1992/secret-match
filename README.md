# SecretMatch

> Secret Santa draws with constraint-aware matching.

SecretMatch is a full-stack web app to organise Secret Santa / gift exchanges for families and groups of friends: invite-link groups, detailed wishlists, an exclusion-aware draw engine, an anonymous mailbox between giver and receiver, and an interactive reveal experience.

## Status

🚧 Early development — the project is being built following a Spec-Driven Development flow. Specs and tickets live in [GitHub Issues](https://github.com/Carrillo1992/secret-match/issues).

## Stack

| Layer | Technology |
|---|---|
| Backend | Java 21, Spring Boot 4 (Web, Security + JWT, Data JPA, Validation), PostgreSQL |
| Frontend | Angular (standalone components, signals), Tailwind CSS |
| Email | Resend API |
| Deploy | Docker (multi-stage), free-tier hosting |

## Repository layout

```
secret-match/
├── backend/    # Spring Boot API
├── frontend/   # Angular SPA
└── docs/       # architecture, ADRs, verification guide
```

## Running locally

Requires Docker. From the repo root:

```bash
cp .env.example .env    # optional: compose falls back to the same local placeholders
docker compose up --build
```

Then open http://localhost:4200. The landing page shows "API OK" when the API is reachable. Every email the API sends lands in the local mail catcher (Mailpit) at http://localhost:8025; nothing is really delivered.

Working on one side only:

| | Command (from the folder) | Needs |
|---|---|---|
| API | `./mvnw spring-boot:run -Dspring-boot.run.profiles=local` | Java 21, PostgreSQL, Mailpit (`docker compose up mailpit`), the API variables in `.env.example` exported |
| API tests | `./mvnw verify` | Java 21, Docker (Testcontainers) |
| SPA | `npm start` | Node 22.22+/24.15+, API on http://localhost:8080 (`public/config.json`) |
| SPA tests | `npm test -- --watch=false` | Node |

## License

TBD
