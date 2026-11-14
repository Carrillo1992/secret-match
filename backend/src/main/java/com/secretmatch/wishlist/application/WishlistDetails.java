package com.secretmatch.wishlist.application;

import java.util.List;
import java.util.UUID;

/** A Member's Wishlist in a Group as any Member of it sees it: whose it is and their Wishes. */
public record WishlistDetails(Owner owner, List<StoredWish> wishes) {

    public WishlistDetails {
        wishes = List.copyOf(wishes);
    }

    /** {@code id} is the id of the User the owner is; {@code you} says whether that is the Member looking. */
    public record Owner(UUID id, String displayName, boolean you) {}
}
