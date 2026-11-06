package com.secretmatch.identity.infrastructure.web;

import com.secretmatch.identity.domain.DisplayName;
import com.secretmatch.identity.domain.EmailAddress;
import com.secretmatch.identity.domain.NewPassword;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** The password must also fit in 72 bytes of UTF-8; the domain checks that. */
record SignUpRequest(
        @NotBlank @Email @Size(max = EmailAddress.MAX_LENGTH)
        String email,

        @NotBlank @Size(max = DisplayName.MAX_LENGTH) String displayName,

        @NotNull @Size(min = NewPassword.MIN_LENGTH, max = NewPassword.MAX_BYTES)
        String password) {

    @Override
    public String toString() {
        return "SignUpRequest[redacted]";
    }
}
