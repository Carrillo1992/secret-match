package com.secretmatch.mailbox.infrastructure;

import com.secretmatch.draw.application.GroupDraw;
import com.secretmatch.mailbox.application.Assignments;
import com.secretmatch.mailbox.domain.MemberId;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Component;

/** Reads a Member's two Assignments through the Draw module's application API. */
@Component
class DrawAssignments implements Assignments {

    private final GroupDraw draws;

    DrawAssignments(GroupDraw draws) {
        this.draws = draws;
    }

    @Override
    public Optional<MemberId> receiverOf(UUID groupId, MemberId member) {
        return draws.findMyReceiver(groupId, member.value()).map(receiver -> new MemberId(receiver.id()));
    }

    @Override
    public Optional<MemberId> giverOf(UUID groupId, MemberId member) {
        return draws.findMyGiver(groupId, member.value()).map(MemberId::new);
    }
}
