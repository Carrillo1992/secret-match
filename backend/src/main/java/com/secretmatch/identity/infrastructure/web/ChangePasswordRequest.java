package com.secretmatch.identity.infrastructure.web;

import com.secretmatch.identity.domain.NewPassword;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * {@code currentPassword} is left out by a User who has no password yet. The new password mirrors the
 * domain rules like {@link SignUpRequest}.
 */
record ChangePasswordRequest(
        String currentPassword,

        @NotNull @Size(min = NewPassword.MIN_LENGTH, max = NewPassword.MAX_BYTES)
        String newPassword) {

    @Override
    public String toString() {
        return "ChangePasswordRequest[redacted]";
    }
}
