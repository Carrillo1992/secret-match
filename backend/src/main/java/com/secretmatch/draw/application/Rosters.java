package com.secretmatch.draw.application;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** Port to the Groups module: who is in a Group and who is its Admin. */
public interface Rosters {

    /**
     * The Group's Roster as {@code viewer} may see it.
     *
     * @return empty if there is no such Group or {@code viewer} is not one of its Members
     */
    Optional<Roster> of(UUID groupId, UUID viewer);

    /** The Groups this User is a Member of whose Exchange Date has not passed. */
    List<UUID> unfinishedGroupsOf(UUID member);

    /**
     * Like {@link #of}, but first locks the Group until the transaction ends, so nobody joins or leaves it, and
     * no other change that reads it this way runs, meanwhile.
     *
     * @return empty if there is no such Group or {@code viewer} is not one of its Members
     */
    Optional<Roster> lockedOf(UUID groupId, UUID viewer);

    /** Records that the Group's Draw is made, which freezes who is in it. Call it after {@link #lockedOf}. */
    void markDrawn(UUID groupId);

    /** Records that the Group's Draw is cancelled, which unfreezes who is in it. Call it after {@link #lockedOf}. */
    void markDrawCancelled(UUID groupId);
}
