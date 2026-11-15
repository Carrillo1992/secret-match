package com.secretmatch.identity.domain;

import java.security.SecureRandom;

/**
 * The secret in a link emailed to a User, such as a sign-up verification link. Only the inbox ever sees
 * it; what is stored is its {@link #hash()}, so a leaked table cannot be turned into working links.
 */
public final class EmailLinkToken extends SecretToken {

    private EmailLinkToken(String value) {
        super(value);
    }

    /** A new token of 256 random bits. */
    public static EmailLinkToken generate(SecureRandom random) {
        return new EmailLinkToken(randomValue(random));
    }

    /** The token as it came back in a link. */
    public static EmailLinkToken of(String value) {
        return new EmailLinkToken(value);
    }
}
