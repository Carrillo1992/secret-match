package com.secretmatch.identity.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatNoException;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class EmailVerificationTest {

    private static final Instant ISSUED = Instant.parse("2026-12-01T10:00:00Z");
    private static final UserId USER = new UserId(UUID.fromString("00000000-0000-0000-0000-000000000001"));

    private final VerificationToken token = VerificationToken.generate(new SecureRandom());
    private final EmailVerification verification = EmailVerification.issue(token, USER, ISSUED);

    @Test
    @DisplayName("a link works until 24 hours after it was sent")
    void worksForTwentyFourHours() {
        assertThatNoException()
                .isThrownBy(
                        () -> verification.use(ISSUED.plus(Duration.ofHours(24)).minusSeconds(1)));
    }

    @Test
    @DisplayName("a link is rejected as expired 24 hours after it was sent")
    void expiresAfterTwentyFourHours() {
        assertThatThrownBy(() -> verification.use(ISSUED.plus(Duration.ofHours(24))))
                .isInstanceOf(VerificationLinkExpiredException.class)
                .extracting("code")
                .isEqualTo("verification-link-expired");
    }

    @Test
    @DisplayName("a link works only once")
    void worksOnlyOnce() {
        verification.use(ISSUED.plusSeconds(60));

        assertThatThrownBy(() -> verification.use(ISSUED.plusSeconds(120)))
                .isInstanceOf(VerificationLinkUsedException.class)
                .extracting("code")
                .isEqualTo("verification-link-used");
    }

    @Test
    @DisplayName("a used link says it was used, even once it has also expired")
    void usedWinsOverExpired() {
        verification.use(ISSUED.plusSeconds(60));

        assertThatThrownBy(() -> verification.use(ISSUED.plus(Duration.ofDays(3))))
                .isInstanceOf(VerificationLinkUsedException.class);
    }

    @Test
    @DisplayName("the link stores only a hash of its token, which the same token finds again")
    void storesOnlyTheTokenHash() {
        assertThat(verification.tokenHash()).isNotEqualTo(token.value());
        assertThat(VerificationToken.of(token.value()).hash()).isEqualTo(verification.tokenHash());
        assertThat(verification.tokenHash())
                .isNotEqualTo(VerificationToken.generate(new SecureRandom()).hash());
    }

    @Test
    @DisplayName("a token is URL-safe, unguessable in length and never printed")
    void tokenShape() {
        assertThat(token.value()).matches("[A-Za-z0-9_-]{43}");
        assertThat(token.toString()).doesNotContain(token.value());
    }

    @Test
    @DisplayName("SHA-256 of a known token, as hex")
    void knownHash() {
        // printf 'abc' | sha256sum
        assertThat(VerificationToken.of("abc").hash())
                .isEqualTo("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    }
}
