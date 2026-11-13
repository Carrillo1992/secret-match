package com.secretmatch.wishlist.domain;

import com.secretmatch.shared.domain.DomainException;

/**
 * A Member tried to change a Wish on someone else's Wishlist. Every Member of the Group can see that Wish, so
 * saying it exists leaks nothing.
 */
public class NotYourWishException extends DomainException {

    public NotYourWishException() {
        super("wish-not-yours", "Only the owner of a Wishlist can change its Wishes.");
    }
}
