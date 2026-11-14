package com.secretmatch.wishlist.application;

import com.secretmatch.wishlist.domain.MemberId;
import com.secretmatch.wishlist.domain.Wish;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** Port to where each Member's Wishes in each Group are stored. */
public interface Wishes {

    /** The Member's Wishes in the Group, oldest first. */
    List<StoredWish> of(UUID groupId, MemberId owner);

    /** The Group's Wish with that id, whoever owns it. */
    Optional<StoredWish> find(UUID groupId, UUID wishId);

    StoredWish add(UUID groupId, MemberId owner, Wish wish, Instant createdAt);

    /** Replaces what an existing Wish says; its id, owner and age stay. */
    StoredWish replace(UUID groupId, StoredWish wish);

    void remove(UUID groupId, UUID wishId);

    /** Deletes every Wish of this Member in the Group. */
    void removeAllOf(UUID groupId, MemberId owner);

    /** Deletes every Wish in the Group. */
    void removeAllIn(UUID groupId);
}
