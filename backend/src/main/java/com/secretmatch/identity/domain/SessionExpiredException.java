package com.secretmatch.identity.domain;

import com.secretmatch.shared.domain.DomainException;

/** The refresh token is missing, unknown, expired, revoked or reused: the User has to sign in again. */
public class SessionExpiredException extends DomainException {

    public SessionExpiredException() {
        super("session-expired", "The session has ended. Sign in again.");
    }
}
