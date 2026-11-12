package com.secretmatch.draw.infrastructure;

import com.secretmatch.draw.application.Roster;
import com.secretmatch.draw.application.Rosters;
import com.secretmatch.draw.domain.MemberId;
import com.secretmatch.group.application.GroupDetails;
import com.secretmatch.group.application.MyGroups;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Component;

/** Reads a Group's Roster through the Groups module's application API. */
@Component
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
        MemberId admin = group.members().stream()
                .filter(GroupDetails.Member::admin)
                .map(member -> new MemberId(member.id()))
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("a Group without an Admin"));
        return new Roster(
                group.name(),
                admin,
                group.members().stream()
                        .map(member -> new Roster.Member(new MemberId(member.id()), member.displayName()))
                        .toList(),
                group.finished());
    }
}
