package com.secretmatch.identity.infrastructure.web;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

/**
 * @param idToken the ID token Google Identity Services gave the SPA
 * @param language the Language the sign-in is made in; only a User it creates gets it
 */
record GoogleSignInRequest(
        @NotBlank String idToken,

        @NotNull
        @Pattern(regexp = LanguageRequest.CODES)
        @Schema(allowableValues = {LanguageRequest.ES, LanguageRequest.EN})
        String language) {

    @Override
    public String toString() {
        return "GoogleSignInRequest[redacted]";
    }
}
