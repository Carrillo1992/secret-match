package com.secretmatch.mailbox.application;

import com.secretmatch.mailbox.domain.MemberId;
import com.secretmatch.shared.domain.Language;
import java.util.Optional;

/**
 * Port to the Identity module: where and in which Language to email a Member. The address is only for sending to that
 * Member; it is never shown to anyone, logged or put in an error.
 */
public interface MemberEmails {

    /** Where to email the Member and in which Language; empty if they have no User any more. */
    Optional<Recipient> recipientOf(MemberId member);

    /** A Member's email address and the Language they read their emails in. */
    record Recipient(String email, Language language) {

        /** Leaves out the address: it is personal data (anonymity invariant). */
        @Override
        public String toString() {
            return "Recipient[redacted]";
        }
    }
}
