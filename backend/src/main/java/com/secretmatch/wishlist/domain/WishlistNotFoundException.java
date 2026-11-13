package com.secretmatch.wishlist.domain;

import com.secretmatch.shared.domain.NotFoundException;

/** The Group has no Member with that id, so there is no Wishlist of theirs in it. */
public class WishlistNotFoundException extends NotFoundException {

    public WishlistNotFoundException() {
        super("wishlist-not-found", "The Wishlist does not exist.");
    }
}
