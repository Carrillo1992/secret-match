package com.secretmatch.identity.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class SignUpVerificationTest {

    private static final Instant STARTED = Instant.parse("2026-12-01T10:00:00Z");
    private static final SecureRandom RANDOM = new SecureRandom();

    private final EmailLinkToken token = EmailLinkToken.generate(RANDOM);
    private final SignUpVerification signUp = SignUpVerification.start(
            new EmailAddress("ana@example.com"),
            new com.secretmatch.identity.domain.DisplayName("Ana"),
            new PasswordHash("$2a$10$ana"),
            token,
            STARTED);

    @Test
    @DisplayName("opening the link creates the User with the details of that sign-up")
    void verifyCreatesTheUser() {
        User user = signUp.verify(STARTED.plusSeconds(60));

        assertThat(user.email().value()).isEqualTo("ana@example.com");
        assertThat(user.displayName().value()).isEqualTo("Ana");
        assertThat(user.passwordHash()).contains(new PasswordHash("$2a$10$ana"));
        assertThat(user.createdAt()).isEqualTo(STARTED.plusSeconds(60));
    }

    @Test
    @DisplayName("a link works until 24 hours after it was sent")
    void worksForTwentyFourHours() {
        assertThat(signUp.verify(STARTED.plus(Duration.ofHours(24)).minusSeconds(1)))
                .isNotNull();
    }

    @Test
    @DisplayName("a link is rejected as expired 24 hours after it was sent")
    void expiresAfterTwentyFourHours() {
        assertThatThrownBy(() -> signUp.verify(STARTED.plus(Duration.ofHours(24))))
                .isInstanceOf(VerificationLinkExpiredException.class)
                .extracting("code")
                .isEqualTo("verification-link-expired");
    }

    @Test
    @DisplayName("a link works only once, and says so even once it has also expired")
    void worksOnlyOnce() {
        signUp.verify(STARTED.plusSeconds(60));

        assertThatThrownBy(() -> signUp.verify(STARTED.plusSeconds(120)))
                .isInstanceOf(VerificationLinkUsedException.class)
                .extracting("code")
                .isEqualTo("verification-link-used");
        assertThatThrownBy(() -> signUp.verify(STARTED.plus(Duration.ofDays(3))))
                .isInstanceOf(VerificationLinkUsedException.class);
    }

    @Test
    @DisplayName("a new link replaces the old one and gets a fresh 24 hours")
    void reissueReplacesTheLink() {
        Instant later = STARTED.plus(Duration.ofHours(30));
        EmailLinkToken newToken = EmailLinkToken.generate(RANDOM);

        signUp.reissue(newToken, later);

        assertThat(signUp.tokenHash()).isEqualTo(newToken.hash()).isNotEqualTo(token.hash());
        assertThat(signUp.verify(later.plus(Duration.ofHours(23)))).isNotNull();
    }

    @Test
    @DisplayName("a used sign-up cannot get a new link")
    void usedSignUpCannotBeReissued() {
        signUp.verify(STARTED.plusSeconds(60));

        assertThat(signUp.isUsed()).isTrue();
        assertThatThrownBy(() -> signUp.reissue(EmailLinkToken.generate(RANDOM), STARTED.plusSeconds(120)))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    @DisplayName("only a hash of the token is kept, and the same token finds it again")
    void keepsOnlyTheTokenHash() {
        assertThat(signUp.tokenHash().value()).isNotEqualTo(token.value());
        assertThat(EmailLinkToken.of(token.value()).hash()).isEqualTo(signUp.tokenHash());
    }

    @Test
    @DisplayName("a token is URL-safe, 256 bits long and never printed")
    void tokenShape() {
        assertThat(token.value()).matches("[A-Za-z0-9_-]{43}");
        assertThat(token.toString()).doesNotContain(token.value());
    }

    @Test
    @DisplayName("the token hash is SHA-256 as hex")
    void knownHash() {
        // printf 'abc' | sha256sum
        assertThat(EmailLinkToken.of("abc").hash())
                .isEqualTo(new TokenHash("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"));
    }
}
