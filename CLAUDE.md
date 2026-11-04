# SecretMatch

Secret Santa / gift-exchange web app: invite-link groups, wishlists, an exclusion-aware draw engine, an anonymous giver→receiver mailbox and an interactive reveal. Monorepo: `backend/` (Java 21, Spring Boot 4, PostgreSQL) and `frontend/` (Angular, signals, Tailwind).

Work follows Spec-Driven Development: specs and tickets are GitHub issues (see **Agent skills** below). Code without a spec or ticket behind it is the exception, not the rule.

## Project docs: when to read what

| Before you… | Read |
|---|---|
| write a spec or tickets, add a module, or change how layers talk | `docs/architecture.md` |
| write or review code | `CODING_STANDARDS.md` (plus `backend/CLAUDE.md` or `frontend/CLAUDE.md` when working in those folders) |
| declare a ticket done or open a PR | `docs/verification.md`, and actually run what it says |
| name a domain concept anywhere (code, tests, issues) | `GLOSSARY.md` |
| touch an area with past decisions | `docs/adr/` |

These docs describe intent. If code and docs disagree, surface it instead of silently picking one.

## Working rules

- **Language**: code, docs, commits, issues and PRs in English.
- **Commits**: Conventional Commits with a scope: `feat(backend): …`, `fix(frontend): …`, `docs: …`, `ci: …`, `chore(repo): …`.
- **Branches**: `<type>/<issue-number>-<short-slug>`, e.g. `feat/12-draw-engine`. One ticket per PR; the PR body says `Closes #<n>`.
- **Anonymity is a product invariant**: a receiver must never be able to learn who their giver is. That covers API responses, logs, emails and error messages. Treat any leak as a critical bug.
- **Secrets** only come from environment variables. Never commit them, not even in examples (`.env.example` holds placeholder values only).
- Do not add dependencies, modules or abstractions the current ticket does not need.
- When adding a dependency or framework, take the latest stable version from its registry (Maven Central, npm), never from memory.

## Agent skills

### Issue tracker

Issues and specs live in GitHub Issues (Carrillo1992/secret-match), managed with the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default five-role vocabulary: needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
