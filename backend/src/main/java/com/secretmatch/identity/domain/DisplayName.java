package com.secretmatch.identity.domain;

/** How a User is shown to others, trimmed. */
public record DisplayName(String value) {

    public static final int MAX_LENGTH = 50;

    public DisplayName {
        value = value == null ? "" : value.strip();
        if (value.isEmpty() || value.length() > MAX_LENGTH) {
            throw InvalidUserDetailsException.displayName();
        }
    }
}
