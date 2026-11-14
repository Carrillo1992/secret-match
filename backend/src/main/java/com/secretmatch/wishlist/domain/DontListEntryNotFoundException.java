package com.secretmatch.wishlist.domain;

import com.secretmatch.shared.domain.NotFoundException;

/**
 * The Group has no Don't List entry with that id, or it is on someone else's Don't List: the two look the same, so
 * nobody but its owner can tell an entry exists.
 */
public class DontListEntryNotFoundException extends NotFoundException {

    public DontListEntryNotFoundException() {
        super("dont-list-entry-not-found", "The Don't List entry does not exist.");
    }
}
