package com.secretmatch.draw.domain;

import java.util.Objects;

/**
 * The directed pair Giver → Receiver produced by a Draw.
 *
 * <p>It prints as {@code Assignment[redacted]}, so an Assignment that reaches a log or an error message never
 * reveals who gives to whom.
 */
public record Assignment(MemberId giver, MemberId receiver) {

    public Assignment {
        Objects.requireNonNull(giver, "giver");
        Objects.requireNonNull(receiver, "receiver");
        if (giver.equals(receiver)) {
            throw new IllegalArgumentException("A Member cannot be their own Receiver");
        }
    }

    @Override
    public String toString() {
        return "Assignment[redacted]";
    }
}
