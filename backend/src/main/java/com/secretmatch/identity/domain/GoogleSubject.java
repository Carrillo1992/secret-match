package com.secretmatch.identity.domain;

/**
 * The id Google gives a Google account (the ID token's {@code sub}). It never changes, unlike the account's
 * email, so it is what a User's Google link remembers.
 */
public record GoogleSubject(String value) {

    public static final int MAX_LENGTH = 255;

    public GoogleSubject {
        if (value == null || value.isBlank() || value.length() > MAX_LENGTH) {
            throw new GoogleSignInRejectedException();
        }
    }
}
