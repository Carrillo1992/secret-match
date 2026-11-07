package com.secretmatch.identity.infrastructure.web;

import com.secretmatch.identity.domain.EmailAddress;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** The email of the User who forgot their password, as typed. */
record PasswordResetEmailRequest(
        @NotBlank @Size(max = EmailAddress.MAX_LENGTH) @Pattern(regexp = EmailAddress.SHAPE)
        String email) {

    @Override
    public String toString() {
        return "PasswordResetEmailRequest[redacted]";
    }
}
