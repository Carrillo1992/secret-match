package com.secretmatch.draw.domain;

import java.util.Set;

/** What the {@link DrawEngine} produces: a complete Draw, or the fact that no valid Draw exists. */
public sealed interface DrawResult {

    /** A complete Draw: one Assignment per Member. Prints without its Assignments, so it is safe to log. */
    record Drawn(Set<Assignment> assignments) implements DrawResult {

        public Drawn {
            assignments = Set.copyOf(assignments);
        }

        @Override
        public String toString() {
            return "Drawn[redacted]";
        }
    }

    /** No set of Assignments satisfies every rule. Deliberately says nothing about which Exclusion is to blame. */
    record NoValidDraw() implements DrawResult {}
}
