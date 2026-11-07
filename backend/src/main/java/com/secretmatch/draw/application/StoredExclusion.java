package com.secretmatch.draw.application;

import com.secretmatch.draw.domain.Exclusion;
import java.util.Objects;
import java.util.UUID;

/** An Exclusion kept in a Group, with the id the Admin deletes it by. */
public record StoredExclusion(UUID id, Exclusion exclusion) {

    public StoredExclusion {
        Objects.requireNonNull(id, "id");
        Objects.requireNonNull(exclusion, "exclusion");
    }
}
