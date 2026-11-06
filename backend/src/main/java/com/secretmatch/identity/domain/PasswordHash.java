package com.secretmatch.identity.domain;

/** A one-way hash of a User's password, as the password hasher wrote it. */
public record PasswordHash(String value) {

    public PasswordHash {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("a password hash must not be blank");
        }
    }

    @Override
    public String toString() {
        return "PasswordHash[redacted]";
    }
}
