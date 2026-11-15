package com.secretmatch.identity.application;

import com.secretmatch.shared.domain.Language;

/**
 * Where to email a User and the Language to write to them in. The address is only for sending to that User; it is
 * never shown to anyone else.
 */
public record EmailRecipient(String email, Language language) {

    /** Leaves out the address: it is personal data (anonymity invariant). */
    @Override
    public String toString() {
        return "EmailRecipient[redacted]";
    }
}
