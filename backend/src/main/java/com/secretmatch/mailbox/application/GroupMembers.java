package com.secretmatch.mailbox.application;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** Port to the Groups module: who the Members of a Group are. */
public interface GroupMembers {

    /**
     * The Group's Members, as {@code viewer} may see them.
     *
     * @return empty if there is no such Group or {@code viewer} is not one of its Members
     */
    Optional<List<GroupMember>> of(UUID groupId, UUID viewer);
}
