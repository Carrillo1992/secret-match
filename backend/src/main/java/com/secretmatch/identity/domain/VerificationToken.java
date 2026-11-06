package com.secretmatch.identity.domain;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.HexFormat;

/**
 * The secret in a verification link. Only the User's inbox ever sees it; the database keeps its
 * {@link #hash()}, so a leaked table cannot be turned into working links.
 */
public final class VerificationToken {

    private static final int BYTES = 32;

    private final String value;

    private VerificationToken(String value) {
        this.value = value;
    }

    /** A new token from a cryptographically strong random source. */
    public static VerificationToken generate(SecureRandom random) {
        byte[] bytes = new byte[BYTES];
        random.nextBytes(bytes);
        return new VerificationToken(Base64.getUrlEncoder().withoutPadding().encodeToString(bytes));
    }

    /** The token as it came back in a link. */
    public static VerificationToken of(String value) {
        if (value == null || value.isBlank()) {
            throw new VerificationLinkInvalidException();
        }
        return new VerificationToken(value);
    }

    public String value() {
        return value;
    }

    /** SHA-256 as lower-case hex: what is stored and looked up. */
    public String hash() {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("every JDK provides SHA-256", e);
        }
    }

    @Override
    public String toString() {
        return "VerificationToken[redacted]";
    }
}
