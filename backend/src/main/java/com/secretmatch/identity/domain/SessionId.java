package com.secretmatch.identity.domain;

import java.util.Objects;
import java.util.UUID;

/**
 * Identifies one sign-in and every refresh token rotated from it (the token family). Revoking it ends
 * that sign-in, and only that one.
 */
public record SessionId(UUID value) {

    public SessionId {
        Objects.requireNonNull(value, "value");
    }

    public static SessionId newId() {
        return new SessionId(UUID.randomUUID());
    }
}
