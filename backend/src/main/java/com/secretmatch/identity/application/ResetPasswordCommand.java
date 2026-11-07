package com.secretmatch.identity.application;

import com.secretmatch.identity.domain.EmailLinkToken;

/** The token from a reset link, and the password chosen in its place. */
public record ResetPasswordCommand(EmailLinkToken token, String newPassword) {

    @Override
    public String toString() {
        return "ResetPasswordCommand[redacted]";
    }
}
