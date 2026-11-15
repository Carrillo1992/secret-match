package com.secretmatch.identity.application;

import com.secretmatch.identity.domain.DisplayName;
import com.secretmatch.identity.domain.EmailAddress;
import com.secretmatch.identity.domain.User;
import com.secretmatch.shared.domain.Language;

/**
 * What the signed-in User may read about themselves. {@code hasPassword} is false for a User who only signs
 * in with Google, so they set a first password instead of changing one.
 */
public record CurrentUser(EmailAddress email, DisplayName displayName, boolean hasPassword, Language language) {

    static CurrentUser of(User user) {
        return new CurrentUser(
                user.email(), user.displayName(), user.passwordHash().isPresent(), user.language());
    }

    @Override
    public String toString() {
        return "CurrentUser[redacted]";
    }
}
