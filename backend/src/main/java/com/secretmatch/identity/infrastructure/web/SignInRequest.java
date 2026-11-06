package com.secretmatch.identity.infrastructure.web;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/** No length or shape rules: a sign-in that breaks them simply matches no User. */
record SignInRequest(@NotBlank String email, @NotNull String password) {

    @Override
    public String toString() {
        return "SignInRequest[redacted]";
    }
}
