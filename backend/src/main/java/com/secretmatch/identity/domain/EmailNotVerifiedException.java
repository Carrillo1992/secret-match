package com.secretmatch.identity.domain;

import com.secretmatch.shared.domain.DomainException;

/**
 * A sign-in with the password of a sign-up whose verification link was never opened. Only someone who
 * knows that password gets this answer, so it reveals nothing to anyone else.
 */
public class EmailNotVerifiedException extends DomainException {

    public EmailNotVerifiedException() {
        super("email-not-verified", "This email has not been verified yet. Open the link we emailed you.");
    }
}
