package com.secretmatch.identity.infrastructure.web;

import jakarta.validation.constraints.NotBlank;

/** @param idToken the ID token Google Identity Services gave the SPA */
record GoogleSignInRequest(@NotBlank String idToken) {

    @Override
    public String toString() {
        return "GoogleSignInRequest[redacted]";
    }
}
