package com.secretmatch.group.domain;

import java.util.Objects;
import java.util.UUID;

/** A Member of a Group, identified by the id of the User they are: a User is a Member of a Group only once. */
public record MemberId(UUID value) {

    public MemberId {
        Objects.requireNonNull(value, "value");
    }
}
