# SecretMatch

> Secret Santa draws with constraint-aware matching.

SecretMatch is a full-stack web app to organise Secret Santa / gift exchanges for families and groups of friends: invite-link groups, detailed wishlists, an exclusion-aware draw engine, an anonymous mailbox between giver and receiver, and an interactive reveal experience.

## Status

🚧 Early development — the project is being built following a Spec-Driven Development flow. Specs and tickets live in [GitHub Issues](https://github.com/Carrillo1992/secret-match/issues).

## Stack

| Layer | Technology |
|---|---|
| Backend | Java 21, Spring Boot 3 (Web, Security + JWT, Data JPA, Validation), PostgreSQL |
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

## License

TBD
