package com.secretmatch.identity.domain;

import java.security.SecureRandom;
import java.util.Base64;

/**
 * The secret in a link emailed to a User, such as a sign-up verification link. Only the inbox ever sees
 * it; what is stored is its {@link #hash()}, so a leaked table cannot be turned into working links.
 */
public final class EmailLinkToken {

    private static final int BYTES = 32;

    private final String value;

    private EmailLinkToken(String value) {
        this.value = value;
    }

    /** A new token of 256 random bits. */
    public static EmailLinkToken generate(SecureRandom random) {
        byte[] bytes = new byte[BYTES];
        random.nextBytes(bytes);
        return new EmailLinkToken(Base64.getUrlEncoder().withoutPadding().encodeToString(bytes));
    }

    /** The token as it came back in a link. */
    public static EmailLinkToken of(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("a token must not be blank");
        }
        return new EmailLinkToken(value);
    }

    public String value() {
        return value;
    }

    public TokenHash hash() {
        return TokenHash.of(value);
    }

    @Override
    public String toString() {
        return "EmailLinkToken[redacted]";
    }
}
