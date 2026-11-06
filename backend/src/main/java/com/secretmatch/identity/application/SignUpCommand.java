package com.secretmatch.identity.application;

/** The details a visitor typed into the sign-up form, not yet validated by the domain. */
public record SignUpCommand(String email, String displayName, String password) {

    /** Leaves out the email and the password. */
    @Override
    public String toString() {
        return "SignUpCommand[redacted]";
    }
}
