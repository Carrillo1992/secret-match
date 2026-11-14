package com.secretmatch.mailbox.application;

import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** Port to the Groups module: who the Members of a Group are, whether it is finished, and its Time Zone. */
public interface GroupMembers {

    /**
     * The Group's Members, as {@code viewer} may see them.
     *
     * @return empty if there is no such Group or {@code viewer} is not one of its Members
     */
    Optional<List<GroupMember>> of(UUID groupId, UUID viewer);

    /**
     * The Group's name, as {@code viewer} sees it.
     *
     * @return empty if there is no such Group or {@code viewer} is not one of its Members
     */
    Optional<String> nameOf(UUID groupId, UUID viewer);

    /**
     * Whether the Group is finished, its Exchange Date over, as {@code viewer} sees it.
     *
     * @return empty if there is no such Group or {@code viewer} is not one of its Members
     */
    Optional<Boolean> isFinished(UUID groupId, UUID viewer);

    /**
     * The Group's Time Zone, which its Message dates are cut in. It is the Group's, frozen by the Draw, never one the
     * viewer chooses (ADR 0001).
     *
     * @return empty if there is no such Group or {@code viewer} is not one of its Members
     */
    Optional<ZoneId> timeZoneOf(UUID groupId, UUID viewer);
}
