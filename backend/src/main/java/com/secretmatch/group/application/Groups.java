package com.secretmatch.group.application;

import com.secretmatch.group.domain.Group;
import com.secretmatch.group.domain.GroupId;
import com.secretmatch.group.domain.MemberId;
import java.util.List;
import java.util.Optional;

/** Port to where Groups are stored. */
public interface Groups {

    void add(Group group);

    Optional<Group> findById(GroupId id);

    /** The Groups this User is a Member of, soonest Exchange Date first. */
    List<Group> findWithMember(MemberId user);
}
