package com.secretmatch.identity;

import static org.assertj.core.api.Assertions.assertThat;

import com.secretmatch.MutableClock;
import com.secretmatch.RecordingEmailSender;
import com.secretmatch.TestPostgres;
import java.sql.Timestamp;
import java.time.Instant;
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
 * Ticket #88: the migration that gives Users a Language. It runs on a schema of its own, stopped just before that
 * migration, so the rows it finds are rows made before Users had a Language.
 */
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@Import({TestPostgres.class, RecordingEmailSender.Config.class, MutableClock.Config.class})
class UserLanguageMigrationIT {

    private static final String SCHEMA = "before_user_language";

    /** The last migration before Users had a Language. */
    private static final String LAST_VERSION_WITHOUT_LANGUAGE = "14";

    @Autowired
    DataSource dataSource;

    @Test
    @DisplayName("Users and Sign-up Verifications made before the migration read back the Language es")
    void existingRowsGetSpanish() {
        migrate(LAST_VERSION_WITHOUT_LANGUAGE);
        JdbcTemplate jdbc = new JdbcTemplate(dataSource);
        UUID userId = UUID.randomUUID();
        UUID signUpId = UUID.randomUUID();
        jdbc.update(
                "INSERT INTO " + SCHEMA + ".users (id, email, display_name, password_hash, created_at)"
                        + " VALUES (?, 'ana@example.com', 'Ana', NULL, now())",
                userId);
        jdbc.update(
                "INSERT INTO " + SCHEMA + ".sign_up_verifications"
                        + " (id, email, display_name, password_hash, token_hash, expires_at)"
                        + " VALUES (?, 'luis@example.com', 'Luis', 'hash', 'token-hash', ?)",
                signUpId,
                Timestamp.from(Instant.parse("2026-12-24T00:00:00Z")));

        migrate("latest");

        assertThat(jdbc.queryForObject("SELECT language FROM " + SCHEMA + ".users WHERE id = ?", String.class, userId))
                .isEqualTo("es");
        assertThat(jdbc.queryForObject(
                        "SELECT language FROM " + SCHEMA + ".sign_up_verifications WHERE id = ?",
                        String.class,
                        signUpId))
                .isEqualTo("es");
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
