package com.secretmatch.identity.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.secretmatch.identity.domain.RefreshToken.State;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class RefreshTokenTest {

    private static final Instant SIGNED_IN = Instant.parse("2026-12-01T10:00:00Z");
    private static final SecureRandom RANDOM = new SecureRandom();

    private final UserId user = UserId.newId();

    @Test
    @DisplayName("a new session's token works for 30 days, and not a moment longer")
    void worksForThirtyDays() {
        RefreshToken token = RefreshToken.startSession(user, RefreshTokenValue.generate(RANDOM), SIGNED_IN);

        assertThat(token.stateAt(SIGNED_IN.plus(Duration.ofDays(30)).minusSeconds(1)))
                .isEqualTo(State.ACTIVE);
        assertThat(token.stateAt(SIGNED_IN.plus(Duration.ofDays(30)))).isEqualTo(State.EXPIRED);
    }

    @Test
    @DisplayName("rotating spends the token and hands over to a successor in the same session, valid 30 more days")
    void rotationHandsOverToSuccessor() {
        RefreshToken token = RefreshToken.startSession(user, RefreshTokenValue.generate(RANDOM), SIGNED_IN);
        RefreshTokenValue next = RefreshTokenValue.generate(RANDOM);
        Instant refreshedAt = SIGNED_IN.plus(Duration.ofDays(20));

        RefreshToken successor = token.rotate(next, refreshedAt);

        assertThat(token.stateAt(refreshedAt)).isEqualTo(State.ROTATED);
        assertThat(successor.sessionId()).isEqualTo(token.sessionId());
        assertThat(successor.userId()).isEqualTo(user);
        assertThat(successor.tokenHash()).isEqualTo(next.hash());
        assertThat(successor.expiresAt()).isEqualTo(Instant.parse("2027-01-20T10:00:00Z"));
    }

    @Test
    @DisplayName("each sign-in starts its own session")
    void eachSignInIsItsOwnSession() {
        RefreshToken phone = RefreshToken.startSession(user, RefreshTokenValue.generate(RANDOM), SIGNED_IN);
        RefreshToken laptop = RefreshToken.startSession(user, RefreshTokenValue.generate(RANDOM), SIGNED_IN);

        assertThat(phone.sessionId()).isNotEqualTo(laptop.sessionId());
    }

    @Test
    @DisplayName("a revoked token stays revoked, even if it was also rotated or has expired")
    void revokedWins() {
        RefreshToken revokedAfterRotation = new RefreshToken(
                RefreshTokenValue.generate(RANDOM).hash(),
                SessionId.newId(),
                user,
                SIGNED_IN.plus(Duration.ofDays(30)),
                SIGNED_IN.plusSeconds(60),
                SIGNED_IN.plusSeconds(120));

        assertThat(revokedAfterRotation.stateAt(SIGNED_IN.plusSeconds(180))).isEqualTo(State.REVOKED);
        assertThat(revokedAfterRotation.stateAt(SIGNED_IN.plus(Duration.ofDays(40))))
                .isEqualTo(State.REVOKED);
    }

    @Test
    @DisplayName("only an active token can be rotated")
    void onlyActiveTokensRotate() {
        RefreshToken token = RefreshToken.startSession(user, RefreshTokenValue.generate(RANDOM), SIGNED_IN);
        token.rotate(RefreshTokenValue.generate(RANDOM), SIGNED_IN.plusSeconds(60));

        assertThatThrownBy(() -> token.rotate(RefreshTokenValue.generate(RANDOM), SIGNED_IN.plusSeconds(120)))
                .isInstanceOf(IllegalStateException.class);
        RefreshToken expired = RefreshToken.startSession(user, RefreshTokenValue.generate(RANDOM), SIGNED_IN);
        assertThatThrownBy(
                        () -> expired.rotate(RefreshTokenValue.generate(RANDOM), SIGNED_IN.plus(Duration.ofDays(31))))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    @DisplayName("the token value never shows up in logs")
    void valueIsRedacted() {
        RefreshTokenValue value = RefreshTokenValue.generate(RANDOM);

        assertThat(value.toString()).doesNotContain(value.value());
        assertThat(value.hash()).isEqualTo(RefreshTokenValue.of(value.value()).hash());
    }
}
