package com.secretmatch.wishlist.application;

import com.secretmatch.wishlist.domain.MemberId;
import java.util.Optional;
import java.util.UUID;

/** Port to the Draw module: whose Wishlist a Giver may read. */
public interface Receivers {

    /**
     * The Receiver of {@code giver} in the Group's Draw.
     *
     * @return empty if the Group has no Draw, or {@code giver} is not one of its Members
     */
    Optional<MemberId> receiverOf(UUID groupId, UUID giver);
}
