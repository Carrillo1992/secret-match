package com.secretmatch.mailbox.application;

import com.secretmatch.mailbox.domain.MemberId;
import java.util.Optional;

/**
 * Port to the Identity module: where to email a Member. The address is only for sending to that Member; it is never
 * shown to anyone, logged or put in an error.
 */
public interface MemberEmails {

    /** The Member's email address; empty if they have no User any more. */
    Optional<String> emailOf(MemberId member);
}
