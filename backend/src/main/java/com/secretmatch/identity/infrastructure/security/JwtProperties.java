package com.secretmatch.identity.infrastructure.security;

import java.util.Base64;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * @param signingKey Base64 of the HMAC-SHA256 key that signs and checks access tokens, at least 256 bits
 */
@ConfigurationProperties("secretmatch.security.jwt")
record JwtProperties(String signingKey) {

    private static final int MIN_KEY_BYTES = 32;

    /** Fails at startup when the key is missing or too short to be safe. */
    JwtProperties {
        if (signingKey == null || signingKey.isBlank() || keyBytes(signingKey).length < MIN_KEY_BYTES) {
            throw new IllegalArgumentException(
                    "secretmatch.security.jwt.signing-key (JWT_SIGNING_KEY) must be the Base64 of at least 32 bytes");
        }
    }

    byte[] keyBytes() {
        return keyBytes(signingKey);
    }

    private static byte[] keyBytes(String base64) {
        try {
            return Base64.getDecoder().decode(base64.strip());
        } catch (IllegalArgumentException e) {
            return new byte[0];
        }
    }

    @Override
    public String toString() {
        return "JwtProperties[redacted]";
    }
}
