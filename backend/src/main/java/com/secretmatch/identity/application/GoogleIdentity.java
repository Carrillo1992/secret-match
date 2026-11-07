package com.secretmatch.identity.application;

import com.secretmatch.identity.domain.EmailAddress;
import com.secretmatch.identity.domain.GoogleSubject;

/**
 * Who a genuine Google ID token says signed in: their Google account, its verified email and, if Google
 * gives one, their name ({@code null} otherwise).
 */
public record GoogleIdentity(GoogleSubject subject, EmailAddress email, String name) {

    @Override
    public String toString() {
        return "GoogleIdentity[redacted]";
    }
}
