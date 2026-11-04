# The API is built on Spring Boot 4

The API started on Spring Boot 3.5, because the original docs said "Spring Boot 3". By then 3.5 had passed its open-source end of support (2026-06-30), so it no longer got public security fixes. We moved to the current 4.x line (4.1, with OSS support until 2027-07-31) before any feature code existed. That meant changing a POM and two test classes instead of migrating a codebase later.

## Consequences

- Spring Framework 7, Spring Security 7, Jackson 3 (`tools.jackson` packages) and Testcontainers 2. Write new code against these, not against Boot 3-era examples.
- Starters are modular (`spring-boot-starter-webmvc`, `spring-boot-starter-flyway`, `spring-boot-starter-webmvc-test`…). A feature that needs an auto-configuration adds its starter; it is not pulled in transitively.
- HTTP integration tests use `RestTestClient` (`@AutoConfigureRestTestClient`), not `TestRestTemplate`.
- springdoc must stay on its 3.x line, which tracks Boot 4.
- We follow the latest 4.x minor and move to the next one while the current one is still supported.

## Considered Options

- **Stay on 3.5**: matched the docs as written, but runs on an unsupported line from day one, and every module built on it would need migrating later.
- **Boot 4.0**: supported only until 2026-12-31, so it would need a minor upgrade almost straight away.
