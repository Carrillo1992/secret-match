package com.secretmatch.wishlist.domain;

import com.secretmatch.shared.domain.NotFoundException;

/** The Group has no Wish with that id: it never had one, or it was deleted. */
public class WishNotFoundException extends NotFoundException {

    public WishNotFoundException() {
        super("wish-not-found", "The Wish does not exist.");
    }
}
