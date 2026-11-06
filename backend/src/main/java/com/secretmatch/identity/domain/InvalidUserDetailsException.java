package com.secretmatch.identity.domain;

import com.secretmatch.shared.domain.DomainException;

/** An email, display name or password that breaks its rules. The message never repeats the value. */
public class InvalidUserDetailsException extends DomainException {

    private InvalidUserDetailsException(String code, String message) {
        super(code, message);
    }

    static InvalidUserDetailsException email() {
        return new InvalidUserDetailsException("invalid-email", "The email address is not valid.");
    }

    static InvalidUserDetailsException displayName() {
        return new InvalidUserDetailsException(
                "invalid-display-name",
                "The display name must have between 1 and " + DisplayName.MAX_LENGTH + " characters.");
    }

    static InvalidUserDetailsException password() {
        return new InvalidUserDetailsException(
                "invalid-password",
                "The password must have at least " + NewPassword.MIN_LENGTH + " characters and at most "
                        + NewPassword.MAX_BYTES + " bytes.");
    }
}
