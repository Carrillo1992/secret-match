package com.secretmatch.identity;

import static org.assertj.core.api.Assertions.assertThat;

import com.secretmatch.MutableClock;
import com.secretmatch.RecordingEmailSender;
import com.secretmatch.TestPostgres;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.UUID;
import javax.sql.DataSource;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.SpringBootTest.WebEnvironment;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

/**
 * Ticket #96: the migration that records when each sign-up was made. It runs on a schema of its own, stopped just
 * before that migration, so the sign-up it finds was made before sign-ups had that time.
 */
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@Import({TestPostgres.class, RecordingEmailSender.Config.class, MutableClock.Config.class})
class SignUpCreatedAtMigrationIT {

    private static final String SCHEMA = "before_sign_up_created_at";

    /** The last migration before sign-ups had a creation time. */
    private static final String LAST_VERSION_WITHOUT_CREATED_AT = "16";

    @Autowired
    DataSource dataSource;

    @Test
    @DisplayName("a sign-up made before the migration counts as made when its current link was sent")
    void existingSignUpsGetTheirLinkTime() {
        migrate(LAST_VERSION_WITHOUT_CREATED_AT);
        JdbcTemplate jdbc = new JdbcTemplate(dataSource);
        UUID signUpId = UUID.randomUUID();
        jdbc.update(
                "INSERT INTO " + SCHEMA + ".sign_up_verifications"
                        + " (id, email, display_name, password_hash, language, token_hash, expires_at)"
                        + " VALUES (?, 'ana@example.com', 'Ana', '$2a$10$ana', 'es', 'hash', ?)",
                signUpId,
                OffsetDateTime.parse("2026-12-02T10:00:00Z"));

        migrate("latest");

        assertThat(jdbc.queryForObject(
                                "SELECT created_at FROM " + SCHEMA + ".sign_up_verifications WHERE id = ?",
                                OffsetDateTime.class,
                                signUpId)
                        .toInstant())
                .isEqualTo(Instant.parse("2026-12-01T10:00:00Z"));
    }

    private void migrate(String target) {
        Flyway.configure()
                .dataSource(dataSource)
                .schemas(SCHEMA)
                .createSchemas(true)
                .locations("classpath:db/migration")
                .target(target)
                .load()
                .migrate();
    }
}
