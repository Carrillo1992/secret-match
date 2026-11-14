package com.secretmatch.wishlist.application;

import com.secretmatch.wishlist.domain.Preferences;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

/**
 * A Member's Wishlist in a Group as its owner or their Giver sees it: whose it is, their Wishes, their Preferences
 * and their Don't List.
 */
public record WishlistDetails(
        Owner owner, List<StoredWish> wishes, Preferences preferences, List<StoredDontListEntry> dontList) {

    public WishlistDetails {
        wishes = List.copyOf(wishes);
        Objects.requireNonNull(preferences, "preferences");
        dontList = List.copyOf(dontList);
    }

    /** {@code id} is the id of the User the owner is; {@code you} says whether that is the Member looking. */
    public record Owner(UUID id, String displayName, boolean you) {}
}
