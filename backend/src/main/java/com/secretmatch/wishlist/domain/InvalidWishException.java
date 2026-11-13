package com.secretmatch.wishlist.domain;

import com.secretmatch.shared.domain.DomainException;

/** A Wish with a field that breaks its rules. */
public class InvalidWishException extends DomainException {

    private InvalidWishException(String code, String message) {
        super(code, message);
    }

    static InvalidWishException title() {
        return new InvalidWishException(
                "invalid-wish-title", "A Wish needs a title of 1 to " + Wish.TITLE_MAX_LENGTH + " characters.");
    }

    static InvalidWishException link() {
        return new InvalidWishException(
                "invalid-wish-link",
                "A Wish's link must be an http or https address of up to " + Wish.LINK_MAX_LENGTH + " characters.");
    }

    static InvalidWishException price() {
        return new InvalidWishException(
                "invalid-wish-price",
                "A Wish's price must be an amount in euros from 0 to below " + Wish.PRICE_LIMIT.toPlainString()
                        + ", to the cent.");
    }

    static InvalidWishException notes() {
        return new InvalidWishException(
                "invalid-wish-notes", "A Wish's notes can have up to " + Wish.NOTES_MAX_LENGTH + " characters.");
    }
}
