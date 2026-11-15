package com.secretmatch.identity.domain;

import java.security.SecureRandom;
import java.util.Base64;

/**
 * An opaque random secret handed out once and only ever stored as its {@link #hash()}: 256 random bits,
 * URL-safe Base64. Each kind of secret is its own subtype, so one can never be passed where another is
 * expected.
 */
public abstract sealed class SecretToken permits EmailLinkToken, RefreshTokenValue {

    private static final int BYTES = 32;

    private final String value;

    SecretToken(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("a token must not be blank");
        }
        this.value = value;
    }

    /** The value of a new token of 256 random bits. */
    static String randomValue(SecureRandom random) {
        byte[] bytes = new byte[BYTES];
        random.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    public final String value() {
        return value;
    }

    public final TokenHash hash() {
        return TokenHash.of(value);
    }

    /** Leaves out the value: it is a working secret and must not reach logs. */
    @Override
    public final String toString() {
        return getClass().getSimpleName() + "[redacted]";
    }
}
