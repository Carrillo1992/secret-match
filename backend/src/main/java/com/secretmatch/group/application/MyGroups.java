package com.secretmatch.group.application;

import com.secretmatch.group.domain.Budget;
import com.secretmatch.group.domain.Group;
import com.secretmatch.group.domain.GroupId;
import com.secretmatch.group.domain.GroupNotFoundException;
import com.secretmatch.group.domain.MemberId;
import com.secretmatch.identity.application.UserDirectory;
import java.time.Clock;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Creating a Group and seeing the Groups a User is a Member of. */
@Service
public class MyGroups {

    private final Groups groups;
    private final UserDirectory users;
    private final Clock clock;

    MyGroups(Groups groups, UserDirectory users, Clock clock) {
        this.groups = groups;
        this.users = users;
        this.clock = clock;
    }

    /**
     * Creates a Group whose Admin and first Member is the User creating it.
     *
     * @throws com.secretmatch.group.domain.InvalidGroupDetailsException if a detail breaks its rules
     */
    @Transactional
    public GroupDetails create(MemberId creator, CreateGroupCommand command) {
        Group group = Group.create(command.name(), command.exchangeDate(), command.budget(), creator, clock.instant());
        groups.add(group);
        return detailsOf(group);
    }

    /** The Groups this User is a Member of, soonest Exchange Date first. */
    @Transactional(readOnly = true)
    public List<GroupSummary> groupsOf(MemberId user) {
        return groups.findWithMember(user).stream()
                .map(group -> new GroupSummary(
                        group.id().value(),
                        group.name().value(),
                        group.exchangeDate(),
                        group.budget().map(Budget::euros).orElse(null),
                        group.members().size(),
                        group.admin().equals(user)))
                .toList();
    }

    /**
     * The Group as one of its Members sees it.
     *
     * @throws GroupNotFoundException if there is no such Group or the viewer is not one of its Members
     */
    @Transactional(readOnly = true)
    public GroupDetails group(GroupId id, MemberId viewer) {
        return detailsOf(memberView(id, viewer));
    }

    /** The Group, only if the User is one of its Members. Every use case on one Group goes through here. */
    private Group memberView(GroupId id, MemberId user) {
        return groups.findById(id).filter(group -> group.hasMember(user)).orElseThrow(GroupNotFoundException::new);
    }

    private GroupDetails detailsOf(Group group) {
        Map<UUID, String> names = users.displayNamesOf(
                group.members().stream().map(MemberId::value).toList());
        return new GroupDetails(
                group.id().value(),
                group.name().value(),
                group.exchangeDate(),
                group.budget().map(Budget::euros).orElse(null),
                group.members().stream()
                        .map(member -> new GroupDetails.Member(names.get(member.value()), member.equals(group.admin())))
                        .toList());
    }
}
