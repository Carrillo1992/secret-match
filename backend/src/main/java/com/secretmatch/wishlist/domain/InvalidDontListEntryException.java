package com.secretmatch.wishlist.domain;

import com.secretmatch.shared.domain.DomainException;

/** A Don't List entry that is empty or too long. */
public class InvalidDontListEntryException extends DomainException {

    InvalidDontListEntryException() {
        super("invalid-dont-list-entry", "A Don't List entry needs 1 to " + DontListEntry.MAX_LENGTH + " characters.");
    }
}
