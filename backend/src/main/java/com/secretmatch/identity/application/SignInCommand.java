package com.secretmatch.identity.application;

/** The email and password typed into the sign-in form. */
public record SignInCommand(String email, String password) {

    /** Leaves out the email and the password. */
    @Override
    public String toString() {
        return "SignInCommand[redacted]";
    }
}
