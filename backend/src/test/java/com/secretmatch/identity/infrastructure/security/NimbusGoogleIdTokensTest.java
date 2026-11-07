package com.secretmatch.identity.infrastructure.security;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.secretmatch.identity.FakeGoogle;
import com.secretmatch.identity.domain.GoogleSignInRejectedException;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;

/** What the API answers when the ID token is not to blame: Google sign-in off, or Google's keys out of reach. */
class NimbusGoogleIdTokensTest {

    private static final Instant NOW = Instant.parse("2026-12-01T10:00:00Z");
    private static final Clock CLOCK = Clock.fixed(NOW, ZoneOffset.UTC);
    private static final String TOKEN =
            FakeGoogle.instance().idToken(NOW, "110248495921238986420", "ana@example.com", "Ana");

    @Test
    void withoutAClientIdEveryTokenIsRejected() {
        NimbusGoogleIdTokens google = new NimbusGoogleIdTokens(new GoogleProperties(" ", "http://unused"), CLOCK);

        assertThatThrownBy(() -> google.verify(TOKEN)).isInstanceOf(GoogleSignInRejectedException.class);
    }

    @Test
    void unreachableGoogleKeysAreAFailureNotARejection() {
        NimbusGoogleIdTokens google = new NimbusGoogleIdTokens(
                new GoogleProperties(FakeGoogle.CLIENT_ID, "http://127.0.0.1:1/oauth2/v3/certs"), CLOCK);

        assertThatThrownBy(() -> google.verify(TOKEN))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageNotContaining(TOKEN);
    }
}
