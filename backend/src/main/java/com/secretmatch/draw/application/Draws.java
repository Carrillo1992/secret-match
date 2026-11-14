package com.secretmatch.draw.application;

import com.secretmatch.draw.domain.Assignment;
import com.secretmatch.draw.domain.MemberId;
import java.time.Instant;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/**
 * Port to where each Group's Draw is stored. Deliberately no way to list a Draw's Assignments. A Member only ever
 * sees the Assignment where they are the Giver (ADR 0001); the one lookup by Receiver, {@link #giverOf}, exists only
 * so the Mailbox can route Messages, and its answer is never shown to anyone.
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

    /**
     * The Giver of this Receiver in the Group's Draw; empty if the Group has no Draw. Only for routing Mailbox
     * Messages: never put the answer in a response, log or email.
     */
    Optional<MemberId> giverOf(UUID groupId, MemberId receiver);

    /** Deletes the Group's Draw and its Assignments, if it has one. */
    void removeIn(UUID groupId);

    /** Deletes every Assignment, in any Group, where this User is the Giver or the Receiver. */
    void removeAssignmentsOf(MemberId user);
}
