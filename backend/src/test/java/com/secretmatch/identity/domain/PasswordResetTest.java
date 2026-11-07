package com.secretmatch.identity.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class PasswordResetTest {

    private static final Instant REQUESTED = Instant.parse("2026-12-01T10:00:00Z");

    private final UserId userId = UserId.newId();
    private final PasswordReset reset =
            PasswordReset.start(userId, EmailLinkToken.generate(new SecureRandom()), REQUESTED);

    @Test
    @DisplayName("opening the link names the User whose password it resets")
    void useNamesTheUser() {
        assertThat(reset.use(REQUESTED.plusSeconds(60))).isEqualTo(userId);
    }

    @Test
    @DisplayName("a link works until one hour after it was sent")
    void worksForOneHour() {
        assertThat(reset.use(REQUESTED.plus(Duration.ofHours(1)).minusSeconds(1)))
                .isEqualTo(userId);
    }

    @Test
    @DisplayName("a link is rejected as expired one hour after it was sent")
    void expiresAfterOneHour() {
        assertThatThrownBy(() -> reset.use(REQUESTED.plus(Duration.ofHours(1))))
                .isInstanceOf(ResetLinkExpiredException.class)
                .extracting("code")
                .isEqualTo("reset-link-expired");
    }

    @Test
    @DisplayName("a link works only once, and says so even once it has also expired")
    void worksOnlyOnce() {
        reset.use(REQUESTED.plusSeconds(60));

        assertThatThrownBy(() -> reset.use(REQUESTED.plusSeconds(120)))
                .isInstanceOf(ResetLinkUsedException.class)
                .extracting("code")
                .isEqualTo("reset-link-used");
        assertThatThrownBy(() -> reset.use(REQUESTED.plus(Duration.ofDays(3))))
                .isInstanceOf(ResetLinkUsedException.class);
    }
}
