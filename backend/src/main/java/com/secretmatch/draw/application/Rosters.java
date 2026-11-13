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
}
