package com.secretmatch.wishlist.infrastructure;

import com.secretmatch.group.application.GroupDetails;
import com.secretmatch.group.application.MyGroups;
import com.secretmatch.wishlist.application.GroupMember;
import com.secretmatch.wishlist.application.GroupMembers;
import com.secretmatch.wishlist.domain.MemberId;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Component;

/** Reads a Group's Members through the Groups module's application API. */
@Component
class GroupMembersOfGroups implements GroupMembers {

    private final MyGroups groups;

    GroupMembersOfGroups(MyGroups groups) {
        this.groups = groups;
    }

    @Override
    public Optional<List<GroupMember>> of(UUID groupId, UUID viewer) {
        return groups.findGroup(groupId, viewer).map(GroupMembersOfGroups::membersOf);
    }

    private static List<GroupMember> membersOf(GroupDetails group) {
        return group.members().stream()
                .map(member -> new GroupMember(new MemberId(member.id()), member.displayName()))
                .toList();
    }
}
