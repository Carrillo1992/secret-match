package com.secretmatch.identity.domain;

import java.util.regex.Pattern;

/** The SHA-256 of an {@link EmailLinkToken}, as 64 lower-case hex digits: what is stored and looked up. */
public record TokenHash(String value) {

    private static final Pattern HEX_SHA_256 = Pattern.compile("[0-9a-f]{64}");

    public TokenHash {
        if (value == null || !HEX_SHA_256.matcher(value).matches()) {
            throw new IllegalArgumentException("a token hash is 64 lower-case hex digits");
        }
    }
}
