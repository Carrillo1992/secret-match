package com.secretmatch.identity.domain;

import java.nio.charset.StandardCharsets;

/**
 * A password a User has just chosen, in plain text, before it is hashed. At most 72 bytes of UTF-8,
 * because BCrypt ignores (or refuses) anything beyond that.
 */
public record NewPassword(String value) {

    public static final int MIN_LENGTH = 8;
    public static final int MAX_BYTES = 72;

    public NewPassword {
        if (value == null || value.length() < MIN_LENGTH || value.getBytes(StandardCharsets.UTF_8).length > MAX_BYTES) {
            throw InvalidUserDetailsException.password();
        }
    }

    @Override
    public String toString() {
        return "NewPassword[redacted]";
    }
}
