package com.secretmatch.identity.domain;

import com.secretmatch.shared.domain.DomainException;

/**
 * A Google sign-in we cannot trust: the ID token is not genuine, not for us, expired, or for an unverified
 * email; or the email's User is linked to another Google account. It never says which.
 */
public class GoogleSignInRejectedException extends DomainException {

    public GoogleSignInRejectedException() {
        super("google-sign-in-rejected", "Google could not confirm who you are. Try again.");
    }
}
