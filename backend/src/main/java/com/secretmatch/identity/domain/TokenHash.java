package com.secretmatch.identity.domain;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.regex.Pattern;

/**
 * The SHA-256 of a secret token (an {@link EmailLinkToken} or a {@link RefreshTokenValue}), as 64
 * lower-case hex digits: what is stored and looked up, so a leaked table cannot be turned into working
 * tokens.
 */
public record TokenHash(String value) {

    private static final Pattern HEX_SHA_256 = Pattern.compile("[0-9a-f]{64}");

    public TokenHash {
        if (value == null || !HEX_SHA_256.matcher(value).matches()) {
            throw new IllegalArgumentException("a token hash is 64 lower-case hex digits");
        }
    }

    static TokenHash of(String secret) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(secret.getBytes(StandardCharsets.UTF_8));
            return new TokenHash(HexFormat.of().formatHex(digest));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("every JDK provides SHA-256", e);
        }
    }
}
