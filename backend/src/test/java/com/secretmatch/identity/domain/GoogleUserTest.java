package com.secretmatch.identity.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;
import org.junit.jupiter.api.Test;

/** A User who signs in with Google: created from their Google account, or linked to it by email. */
class GoogleUserTest {

    private static final Instant NOW = Instant.parse("2026-12-01T10:00:00Z");
    private static final EmailAddress EMAIL = new EmailAddress("ana.garcia@example.com");
    private static final GoogleSubject SUBJECT = new GoogleSubject("110248495921238986420");

    @Test
    void newUserIsNamedAsInGoogleAndHasNoPassword() {
        User user = User.fromGoogle(UserId.newId(), EMAIL, "  Ana García ", SUBJECT, NOW);

        assertThat(user.displayName().value()).isEqualTo("Ana García");
        assertThat(user.passwordHash()).isEmpty();
        assertThat(user.googleSubject()).contains(SUBJECT);
    }

    @Test
    void aGoogleNameTooLongIsCutToTheLimit() {
        User user = User.fromGoogle(UserId.newId(), EMAIL, "Remedios-".repeat(10), SUBJECT, NOW);

        assertThat(user.displayName().value()).isEqualTo("Remedios-Remedios-Remedios-Remedios-Remedios-Remed");
    }

    @Test
    void withoutAGoogleNameTheUserIsNamedAfterTheirEmail() {
        User nameless = User.fromGoogle(UserId.newId(), EMAIL, null, SUBJECT, NOW);
        User blank = User.fromGoogle(UserId.newId(), EMAIL, "   ", SUBJECT, NOW);

        assertThat(nameless.displayName().value()).isEqualTo("ana.garcia");
        assertThat(blank.displayName().value()).isEqualTo("ana.garcia");
    }

    @Test
    void linkingGoogleKeepsThePassword() {
        PasswordHash hash = new PasswordHash("$2a$10$hash");
        User user = User.withPassword(UserId.newId(), EMAIL, new DisplayName("Ana"), hash, NOW);

        user.linkGoogle(SUBJECT);

        assertThat(user.googleSubject()).contains(SUBJECT);
        assertThat(user.passwordHash()).contains(hash);
        assertThat(user.displayName().value()).isEqualTo("Ana");
    }

    @Test
    void linkingTheSameGoogleAccountAgainChangesNothing() {
        User user = User.fromGoogle(UserId.newId(), EMAIL, "Ana", SUBJECT, NOW);

        user.linkGoogle(new GoogleSubject(SUBJECT.value()));

        assertThat(user.googleSubject()).contains(SUBJECT);
    }

    @Test
    void anotherGoogleAccountCannotTakeOverALinkedUser() {
        User user = User.fromGoogle(UserId.newId(), EMAIL, "Ana", SUBJECT, NOW);

        assertThatThrownBy(() -> user.linkGoogle(new GoogleSubject("999")))
                .isInstanceOf(GoogleSignInRejectedException.class);
        assertThat(user.googleSubject()).contains(SUBJECT);
    }
}
