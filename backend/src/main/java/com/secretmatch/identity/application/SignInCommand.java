package com.secretmatch.identity.application;

import com.secretmatch.identity.domain.EmailAddress;
import com.secretmatch.identity.domain.InvalidUserDetailsException;
import java.util.Optional;

/**
 * The email and password typed into the sign-in form. The email is kept as typed: one that is not an email
 * address is not a mistake to report, it simply has no User, and is refused like a wrong password.
 */
public record SignInCommand(String email, String password) {

    /** The email as an {@link EmailAddress}, or empty if it is not one (and so cannot have a User). */
    Optional<EmailAddress> emailAddress() {
        try {
            return Optional.of(new EmailAddress(email));
        } catch (InvalidUserDetailsException e) {
            return Optional.empty();
        }
    }

    /** Leaves out the email and the password. */
    @Override
    public String toString() {
        return "SignInCommand[redacted]";
    }
}
