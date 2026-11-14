package com.secretmatch.identity.application;

import com.secretmatch.identity.domain.Language;
import com.secretmatch.identity.domain.User;

/**
 * What the signed-in User may read about themselves. {@code hasPassword} is false for a User who only signs
 * in with Google, so they set a first password instead of changing one.
 */
public record CurrentUser(String email, String displayName, boolean hasPassword, Language language) {

    static CurrentUser of(User user) {
        return new CurrentUser(
                user.email().value(),
                user.displayName().value(),
                user.passwordHash().isPresent(),
                user.language());
    }

    @Override
    public String toString() {
        return "CurrentUser[redacted]";
    }
}
