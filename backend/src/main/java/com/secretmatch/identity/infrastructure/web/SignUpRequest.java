package com.secretmatch.identity.infrastructure.web;

import com.secretmatch.identity.domain.DisplayName;
import com.secretmatch.identity.domain.EmailAddress;
import com.secretmatch.identity.domain.NewPassword;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Mirrors the domain rules so a mistake is a 400. A password over 72 characters is always over 72 bytes;
 * one with fewer characters but over 72 bytes (accents, emoji) is left to the domain, which answers 422.
 */
record SignUpRequest(
        @NotBlank @Size(max = EmailAddress.MAX_LENGTH) @Pattern(regexp = EmailAddress.SHAPE)
        String email,

        @NotBlank @Size(max = DisplayName.MAX_LENGTH) String displayName,

        @NotNull @Size(min = NewPassword.MIN_LENGTH, max = NewPassword.MAX_BYTES)
        String password) {

    @Override
    public String toString() {
        return "SignUpRequest[redacted]";
    }
}
