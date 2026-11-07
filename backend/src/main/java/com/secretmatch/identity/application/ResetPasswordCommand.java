package com.secretmatch.identity.application;

/** The token from a reset link, and the password chosen in its place. */
public record ResetPasswordCommand(String token, String newPassword) {

    @Override
    public String toString() {
        return "ResetPasswordCommand[redacted]";
    }
}
