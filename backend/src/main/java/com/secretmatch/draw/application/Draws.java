package com.secretmatch.draw.application;

import com.secretmatch.draw.domain.Assignment;
import com.secretmatch.draw.domain.MemberId;
import java.time.Instant;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/**
 * Port to where each Group's Draw is stored. Deliberately no way to list a Draw's Assignments or to look one up by
 * its Receiver: a Member only ever reads the Assignment where they are the Giver (ADR 0001).
 */
public interface Draws {

    /** Whether the Group has a Draw. */
    boolean existsIn(UUID groupId);

    /**
     * Stores the Group's Draw with all its Assignments, unless the Group has one already. Safe when the same Group
     * is drawn twice at once: only one Draw is stored.
     *
     * @return whether it was stored
     */
    boolean add(UUID groupId, Set<Assignment> assignments, Instant drawnAt);

    /** The Receiver of this Giver in the Group's Draw; empty if the Group has no Draw. */
    Optional<MemberId> receiverOf(UUID groupId, MemberId giver);

    /** Deletes the Group's Draw and its Assignments, if it has one. */
    void removeIn(UUID groupId);

    /** Deletes every Assignment, in any Group, where this User is the Giver or the Receiver. */
    void removeAssignmentsOf(MemberId user);
}
