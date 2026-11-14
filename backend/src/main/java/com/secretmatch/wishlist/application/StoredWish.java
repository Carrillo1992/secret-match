package com.secretmatch.wishlist.application;

import com.secretmatch.wishlist.domain.MemberId;
import com.secretmatch.wishlist.domain.Wish;
import java.util.Objects;
import java.util.UUID;

/** A Wish kept on a Member's Wishlist, with the id its owner edits or deletes it by. */
public record StoredWish(UUID id, MemberId owner, Wish wish) {

    public StoredWish {
        Objects.requireNonNull(id, "id");
        Objects.requireNonNull(owner, "owner");
        Objects.requireNonNull(wish, "wish");
    }
}
