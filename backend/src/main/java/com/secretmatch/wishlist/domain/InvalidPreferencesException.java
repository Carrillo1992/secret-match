package com.secretmatch.wishlist.domain;

import com.secretmatch.shared.domain.DomainException;

/** Preferences longer than allowed. */
public class InvalidPreferencesException extends DomainException {

    InvalidPreferencesException() {
        super("invalid-preferences", "Preferences can have up to " + Preferences.MAX_LENGTH + " characters.");
    }
}
