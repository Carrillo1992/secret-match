package com.secretmatch.wishlist.domain;

import java.util.Objects;
import java.util.UUID;

/** A Member of a Group, identified by the id of the User they are. */
public record MemberId(UUID value) {

    public MemberId {
        Objects.requireNonNull(value, "value");
    }
}
