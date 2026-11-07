package com.secretmatch.identity.domain;

import com.secretmatch.shared.domain.DomainException;

/** A password change whose current password is missing or not the User's. */
public class WrongPasswordException extends DomainException {

    public WrongPasswordException() {
        super("wrong-password", "The current password is not correct.");
    }
}
