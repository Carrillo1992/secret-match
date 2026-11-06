package com.secretmatch.group.domain;

import java.util.Objects;
import java.util.UUID;

public record GroupId(UUID value) {

    public GroupId {
        Objects.requireNonNull(value, "value");
    }

    public static GroupId newId() {
        return new GroupId(UUID.randomUUID());
    }
}
