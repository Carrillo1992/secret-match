package com.secretmatch.identity.infrastructure.web;

import jakarta.validation.constraints.NotBlank;

/** The token from a verification link. */
record LinkTokenRequest(@NotBlank String token) {

    @Override
    public String toString() {
        return "LinkTokenRequest[redacted]";
    }
}
