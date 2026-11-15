package com.secretmatch.identity.application;

import com.secretmatch.identity.domain.EmailAddress;

/**
 * How often the signed-out flows may email a link: a limit per email for each kind of request, and a daily
 * cap on Verification and Password Reset emails for the whole app (ADR 0006). Both are silent: over a
 * limit, the use case answers as it always does but saves and sends nothing.
 */
public interface LinkEmailLimits {

    /** The requests that are counted per email. */
    enum LinkRequest {
        SIGN_UP,
        NEW_VERIFICATION_LINK,
        RESET_LINK
    }

    /**
     * Counts one request of this kind for this email, whether or not the email has a User.
     *
     * @return false once the email asked too often in the current window
     */
    boolean allowsRequest(LinkRequest request, EmailAddress email);

    /**
     * Takes one Verification or Password Reset email from today's (UTC) allowance.
     *
     * @return false once today's cap is reached
     */
    boolean allowsSending();
}
