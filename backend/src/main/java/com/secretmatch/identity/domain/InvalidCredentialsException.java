package com.secretmatch.identity.domain;

import com.secretmatch.shared.domain.DomainException;

/** A sign-in with an unknown email or a wrong password. It never says which of the two. */
public class InvalidCredentialsException extends DomainException {

    public InvalidCredentialsException() {
        super("invalid-credentials", "The email or the password is not correct.");
    }
}
