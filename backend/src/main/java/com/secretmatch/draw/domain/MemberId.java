package com.secretmatch.draw.domain;

import java.util.Objects;
import java.util.UUID;

/** A Member of the Group being drawn, identified by the id of the User they are. */
public record MemberId(UUID value) {

    public MemberId {
        Objects.requireNonNull(value, "value");
    }
}
