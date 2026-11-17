package com.secretmatch.notification.infrastructure.push;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import java.security.KeyPair;
import java.util.Base64;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** The message encryption of RFC 8291, checked against the worked example in its Appendix A. */
class WebPushEncryptionTest {

    private static final Base64.Decoder BASE64URL = Base64.getUrlDecoder();
    private static final Base64.Encoder TO_BASE64URL = Base64.getUrlEncoder().withoutPadding();

    // RFC 8291, Appendix A.
    private static final String PLAINTEXT = "When I grow up, I want to be a watermelon";
    private static final String AS_PUBLIC =
            "BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8";
    private static final String AS_PRIVATE = "yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw";
    private static final String UA_PUBLIC =
            "BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4";
    private static final String AUTH_SECRET = "BTBZMqHH6r4Tts7J_aSIgg";
    private static final String SALT = "DGv6ra1nlYgDCS1FRnbzlw";
    private static final String BODY = "DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27ml"
            + "mlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPT"
            + "pK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN";

    @Test
    @DisplayName("encrypts the RFC 8291 example into exactly its message body")
    void encryptsTheRfcExample() {
        KeyPair serverKeys = P256.keyPair(BASE64URL.decode(AS_PRIVATE), BASE64URL.decode(AS_PUBLIC));

        byte[] body = WebPushEncryption.encrypt(
                PLAINTEXT.getBytes(StandardCharsets.UTF_8),
                BASE64URL.decode(UA_PUBLIC),
                BASE64URL.decode(AUTH_SECRET),
                serverKeys,
                BASE64URL.decode(SALT));

        assertThat(TO_BASE64URL.encodeToString(body)).isEqualTo(BODY);
    }

    @Test
    @DisplayName("uses a fresh key pair and salt for every message")
    void freshKeysEveryMessage() {
        WebPushEncryption encryption = new WebPushEncryption();
        byte[] plaintext = PLAINTEXT.getBytes(StandardCharsets.UTF_8);

        byte[] first = encryption.encrypt(plaintext, BASE64URL.decode(UA_PUBLIC), BASE64URL.decode(AUTH_SECRET));
        byte[] second = encryption.encrypt(plaintext, BASE64URL.decode(UA_PUBLIC), BASE64URL.decode(AUTH_SECRET));

        // Header: salt (16) | record size (4) | key length (1) | the server's public key (65).
        assertThat(first).hasSize(BASE64URL.decode(BODY).length);
        assertThat(java.util.Arrays.copyOfRange(first, 0, 16))
                .isNotEqualTo(java.util.Arrays.copyOfRange(second, 0, 16));
        assertThat(java.util.Arrays.copyOfRange(first, 21, 86))
                .isNotEqualTo(java.util.Arrays.copyOfRange(second, 21, 86));
    }
}
