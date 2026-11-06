package com.secretmatch.identity.infrastructure.web;

import jakarta.validation.constraints.NotBlank;

/** The token of a verification link, usually an expired one, to be replaced by a new link. */
record NewLinkRequest(@NotBlank String token) {

    @Override
    public String toString() {
        return "NewLinkRequest[redacted]";
    }
}
