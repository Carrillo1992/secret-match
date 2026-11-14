package com.secretmatch.mailbox.domain;

import java.util.Objects;
import java.util.UUID;

/** Identifies the Group a Mailbox belongs to. */
public record GroupId(UUID value) {

    public GroupId {
        Objects.requireNonNull(value, "value");
    }
}
