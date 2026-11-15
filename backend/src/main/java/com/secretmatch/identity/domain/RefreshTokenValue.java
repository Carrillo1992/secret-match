package com.secretmatch.identity.domain;

import java.security.SecureRandom;

/**
 * The secret that keeps a User signed in: an opaque random value that only the browser's cookie holds.
 * What is stored is its {@link #hash()}.
 */
public final class RefreshTokenValue extends SecretToken {

    private RefreshTokenValue(String value) {
        super(value);
    }

    /** A new token of 256 random bits. */
    public static RefreshTokenValue generate(SecureRandom random) {
        return new RefreshTokenValue(randomValue(random));
    }

    /** The token as it came back in the cookie. */
    public static RefreshTokenValue of(String value) {
        return new RefreshTokenValue(value);
    }
}
