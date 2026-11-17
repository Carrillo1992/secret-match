package com.secretmatch.notification.infrastructure.push;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalArgumentException;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.security.KeyPair;
import java.security.Signature;
import java.security.interfaces.ECPublicKey;
import java.time.Instant;
import java.util.Base64;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** The VAPID identification of RFC 8292 that each push request carries. */
class VapidTest {

    private static final Base64.Decoder BASE64URL = Base64.getUrlDecoder();
    private static final Base64.Encoder TO_BASE64URL = Base64.getUrlEncoder().withoutPadding();

    // The application server key pair of RFC 8291, Appendix A: any valid P-256 pair will do.
    private static final String PUBLIC_KEY =
            "BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8";
    private static final String PRIVATE_KEY = "yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw";

    private static final Instant NOW = Instant.parse("2026-12-24T18:00:00Z");

    private final Vapid vapid = new Vapid(PUBLIC_KEY, PRIVATE_KEY, "mailto:hola@secret-match.app");

    @Test
    @DisplayName("signs a token for the push service's origin, valid for 12 hours, with the public key alongside")
    void signsATokenForThePushService() throws Exception {
        String header = vapid.authorization(URI.create("https://fcm.googleapis.com/fcm/send/abc:def"), NOW);

        assertThat(header).startsWith("vapid t=").endsWith(", k=" + PUBLIC_KEY);
        String token = header.substring("vapid t=".length(), header.indexOf(", k="));
        String[] parts = token.split("\\.");
        assertThat(parts).hasSize(3);
        assertThat(decoded(parts[0])).isEqualTo("{\"typ\":\"JWT\",\"alg\":\"ES256\"}");
        assertThat(decoded(parts[1]))
                .isEqualTo("{\"aud\":\"https://fcm.googleapis.com\",\"exp\":1798178400,"
                        + "\"sub\":\"mailto:hola@secret-match.app\"}");

        ECPublicKey publicKey = P256.publicKey(BASE64URL.decode(PUBLIC_KEY));
        Signature verifier = Signature.getInstance("SHA256withECDSAinP1363Format");
        verifier.initVerify(publicKey);
        verifier.update((parts[0] + "." + parts[1]).getBytes(StandardCharsets.US_ASCII));
        assertThat(verifier.verify(BASE64URL.decode(parts[2]))).isTrue();
    }

    @Test
    @DisplayName("keeps a non-default port in the audience")
    void keepsTheEndpointsPort() {
        String header = vapid.authorization(URI.create("https://push.example.net:8443/x"), NOW);

        String claims = decoded(header.substring("vapid t=".length()).split("\\.")[1]);
        assertThat(claims).contains("\"aud\":\"https://push.example.net:8443\"");
    }

    @Test
    @DisplayName("refuses a private key that does not belong to the public key")
    void refusesMismatchedKeys() {
        KeyPair other = P256.newKeyPair();
        String otherPublic = TO_BASE64URL.encodeToString(P256.uncompressed((ECPublicKey) other.getPublic()));

        assertThatIllegalArgumentException()
                .isThrownBy(() -> new Vapid(otherPublic, PRIVATE_KEY, "mailto:hola@secret-match.app"));
    }

    @Test
    @DisplayName("refuses a subject that is neither a mailto: nor an https: URL")
    void refusesABadSubject() {
        assertThatIllegalArgumentException().isThrownBy(() -> new Vapid(PUBLIC_KEY, PRIVATE_KEY, "hola"));
        assertThatIllegalArgumentException()
                .isThrownBy(() -> new Vapid(PUBLIC_KEY, PRIVATE_KEY, "mailto:\"hola\"@secret-match.app"));
    }

    private static String decoded(String part) {
        return new String(BASE64URL.decode(part), StandardCharsets.UTF_8);
    }
}
