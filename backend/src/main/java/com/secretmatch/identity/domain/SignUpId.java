package com.secretmatch.identity.domain;

import java.util.Objects;
import java.util.UUID;

/** Identifies a {@link SignUpVerification}, so its owner can ask for a new link without an email. */
public record SignUpId(UUID value) {

    public SignUpId {
        Objects.requireNonNull(value, "value");
    }

    public static SignUpId newId() {
        return new SignUpId(UUID.randomUUID());
    }
}
