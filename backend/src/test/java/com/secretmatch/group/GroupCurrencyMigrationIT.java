package com.secretmatch.group;

import static org.assertj.core.api.Assertions.assertThat;

import com.secretmatch.MutableClock;
import com.secretmatch.RecordingEmailSender;
import com.secretmatch.TestPostgres;
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
 * Ticket #93: the migration that gives Groups a Currency. It runs on a schema of its own, stopped just before that
 * migration, so the Group it finds was made before Groups had a Currency.
 */
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@Import({TestPostgres.class, RecordingEmailSender.Config.class, MutableClock.Config.class})
class GroupCurrencyMigrationIT {

    private static final String SCHEMA = "before_group_currency";

    /** The last migration before Groups had a Currency. */
    private static final String LAST_VERSION_WITHOUT_CURRENCY = "15";

    @Autowired
    DataSource dataSource;

    @Test
    @DisplayName("Groups made before the migration read back the Currency EUR")
    void existingGroupsAreInEuros() {
        migrate(LAST_VERSION_WITHOUT_CURRENCY);
        JdbcTemplate jdbc = new JdbcTemplate(dataSource);
        UUID adminId = UUID.randomUUID();
        UUID groupId = UUID.randomUUID();
        // One statement, so one transaction: the Group and its Admin's membership need each other.
        jdbc.execute(("INSERT INTO %1$s.users (id, email, display_name, password_hash, created_at, language)"
                        + " VALUES ('%2$s', 'ana@example.com', 'Ana', NULL, now(), 'es');"
                        + " INSERT INTO %1$s.groups"
                        + " (id, name, exchange_date, budget, admin_id, created_at, invite_code, time_zone)"
                        + " VALUES ('%3$s', 'Navidad', '2026-12-24', 30, '%2$s', now(), 'code', 'UTC');"
                        + " INSERT INTO %1$s.group_members (group_id, user_id, joined_at)"
                        + " VALUES ('%3$s', '%2$s', now());")
                .formatted(SCHEMA, adminId, groupId));

        migrate("latest");

        assertThat(jdbc.queryForObject(
                        "SELECT currency FROM " + SCHEMA + ".groups WHERE id = ?", String.class, groupId))
                .isEqualTo("EUR");
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
