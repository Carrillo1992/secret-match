package com.secretmatch.mailbox.domain;

import java.util.Objects;
import java.util.UUID;

/** Identifies a User across every Group they are in, as opposed to a Member of one Group. */
public record UserId(UUID value) {

    public UserId {
        Objects.requireNonNull(value, "value");
    }
}
