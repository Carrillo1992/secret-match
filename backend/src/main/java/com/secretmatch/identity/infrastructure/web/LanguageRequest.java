package com.secretmatch.identity.infrastructure.web;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

/** Mirrors the domain rule, so an unsupported Language is a 400. */
record LanguageRequest(
        @NotNull
        @Pattern(regexp = LanguageRequest.CODES)
        @Schema(allowableValues = {LanguageRequest.ES, LanguageRequest.EN})
        String language) {

    /** The codes of the supported Languages, as {@code shared.domain.Language} names them. */
    static final String ES = "es";

    static final String EN = "en";

    /** The codes of the supported Languages, as a {@link Pattern} regexp. */
    static final String CODES = ES + "|" + EN;
}
