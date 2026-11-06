package com.secretmatch.identity.infrastructure.web;

import com.secretmatch.identity.domain.EmailAddress;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Asks for a new verification link to be sent to this email. */
record VerificationEmailRequest(
        @NotBlank @Email @Size(max = EmailAddress.MAX_LENGTH)
        String email) {

    @Override
    public String toString() {
        return "VerificationEmailRequest[redacted]";
    }
}
