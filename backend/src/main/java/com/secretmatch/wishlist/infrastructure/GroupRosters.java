package com.secretmatch.wishlist.infrastructure;

import com.secretmatch.group.application.GroupDetails;
import com.secretmatch.group.application.MyGroups;
import com.secretmatch.wishlist.application.GroupMember;
import com.secretmatch.wishlist.application.Roster;
import com.secretmatch.wishlist.application.Rosters;
import com.secretmatch.wishlist.domain.MemberId;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Component;

/** Reads a Group's Roster through the Groups module's application API. */
@Component("wishlistRosters")
class GroupRosters implements Rosters {

    private final MyGroups groups;

    GroupRosters(MyGroups groups) {
        this.groups = groups;
    }

    @Override
    public Optional<Roster> of(UUID groupId, UUID viewer) {
        return groups.findGroup(groupId, viewer).map(GroupRosters::rosterOf);
    }

    private static Roster rosterOf(GroupDetails group) {
        return new Roster(
                group.members().stream()
                        .map(member -> new GroupMember(new MemberId(member.id()), member.displayName()))
                        .toList(),
                group.finished());
    }
}
