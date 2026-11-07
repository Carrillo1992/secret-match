package com.secretmatch.identity.infrastructure.web;

import com.secretmatch.identity.domain.NewPassword;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** The token from a reset link, and the new password, which mirrors the domain rules like {@link SignUpRequest}. */
record PasswordResetRequest(
        @NotBlank String token,

        @NotNull @Size(min = NewPassword.MIN_LENGTH, max = NewPassword.MAX_BYTES)
        String newPassword) {

    @Override
    public String toString() {
        return "PasswordResetRequest[redacted]";
    }
}
