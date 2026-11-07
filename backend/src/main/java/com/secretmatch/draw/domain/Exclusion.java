package com.secretmatch.draw.domain;

import java.util.Objects;

/**
 * Two different Members who may never be assigned to each other, in either direction.
 *
 * <p>An Exclusion is symmetric: A–B and B–A are the same Exclusion, so the two Members are kept in a fixed order
 * and both spellings are equal.
 */
public record Exclusion(MemberId first, MemberId second) {

    public Exclusion {
        Objects.requireNonNull(first, "first");
        Objects.requireNonNull(second, "second");
        if (first.equals(second)) {
            throw new IllegalArgumentException("An Exclusion needs two different Members");
        }
        if (first.value().compareTo(second.value()) > 0) {
            MemberId swap = first;
            first = second;
            second = swap;
        }
    }

    /** Whether this Exclusion forbids {@code one} and {@code other} from being assigned to each other. */
    public boolean separates(MemberId one, MemberId other) {
        return (first.equals(one) && second.equals(other)) || (first.equals(other) && second.equals(one));
    }
}
