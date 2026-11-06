package com.secretmatch.identity.domain;

import java.security.SecureRandom;
import java.util.Base64;

/**
 * The secret that keeps a User signed in: an opaque random value that only the browser's cookie holds.
 * What is stored is its {@link #hash()}.
 */
public final class RefreshTokenValue {

    private static final int BYTES = 32;

    private final String value;

    private RefreshTokenValue(String value) {
        this.value = value;
    }

    /** A new token of 256 random bits. */
    public static RefreshTokenValue generate(SecureRandom random) {
        byte[] bytes = new byte[BYTES];
        random.nextBytes(bytes);
        return new RefreshTokenValue(Base64.getUrlEncoder().withoutPadding().encodeToString(bytes));
    }

    /** The token as it came back in the cookie. */
    public static RefreshTokenValue of(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("a token must not be blank");
        }
        return new RefreshTokenValue(value);
    }

    public String value() {
        return value;
    }

    public TokenHash hash() {
        return TokenHash.of(value);
    }

    @Override
    public String toString() {
        return "RefreshTokenValue[redacted]";
    }
}
