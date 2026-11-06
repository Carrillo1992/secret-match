package com.secretmatch.identity.infrastructure.web;

import io.swagger.v3.oas.annotations.media.Schema;

record CurrentUserResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String email,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String displayName) {

    @Override
    public String toString() {
        return "CurrentUserResponse[redacted]";
    }
}
