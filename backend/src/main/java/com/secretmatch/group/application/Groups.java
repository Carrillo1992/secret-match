package com.secretmatch.group.application;

import com.secretmatch.group.domain.Group;
import com.secretmatch.group.domain.GroupId;
import com.secretmatch.group.domain.InviteCode;
import com.secretmatch.group.domain.MemberId;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

/** Port to where Groups are stored. */
public interface Groups {

    void add(Group group);

    Optional<Group> findById(GroupId id);

    /** The Groups this User is a Member of, soonest Exchange Date first. */
    List<Group> findWithMember(MemberId user);

    /** The Group whose current Invite Link has this code. */
    Optional<Group> findByInviteCode(InviteCode code);

    /**
     * Makes this User a Member of the Group, unless they are one already. Safe when the same User joins
     * twice at once: only one of them adds the Member.
     *
     * @return whether they became a Member just now
     */
    boolean addMember(GroupId group, MemberId user, Instant joinedAt);

    /**
     * Ends this User's membership of the Group. Safe when the same Member is removed twice at once: only one
     * of them removes them.
     *
     * @return whether they stopped being a Member just now
     */
    boolean removeMember(GroupId group, MemberId user);

    /** Stores the Group's name, Exchange Date and budget. */
    void saveDetails(Group group);

    /**
     * Locks the Group until the transaction ends: nobody joins it, and nobody else deletes it, meanwhile. Does
     * nothing if there is no such Group.
     */
    void lock(GroupId group);

    /** Deletes the Group and its Members. */
    void delete(GroupId group);

    /** Stores the Group's current Invite Link code; the previous one stops matching. */
    void saveInviteCode(Group group);
}
