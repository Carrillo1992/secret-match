package com.secretmatch.wishlist.infrastructure;

import com.secretmatch.draw.application.GroupDraw;
import com.secretmatch.wishlist.application.Receivers;
import com.secretmatch.wishlist.domain.MemberId;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Component;

/** Reads a Giver's Receiver through the Draw module's application API. */
@Component
class DrawReceivers implements Receivers {

    private final GroupDraw draws;

    DrawReceivers(GroupDraw draws) {
        this.draws = draws;
    }

    @Override
    public Optional<MemberId> receiverOf(UUID groupId, UUID giver) {
        return draws.findMyReceiver(groupId, giver).map(receiver -> new MemberId(receiver.id()));
    }
}
