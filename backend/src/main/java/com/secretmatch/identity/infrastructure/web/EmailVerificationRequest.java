package com.secretmatch.identity.infrastructure.web;

import jakarta.validation.constraints.NotBlank;

/** The token from a verification link. */
record EmailVerificationRequest(@NotBlank String token) {

    @Override
    public String toString() {
        return "EmailVerificationRequest[redacted]";
    }
}
