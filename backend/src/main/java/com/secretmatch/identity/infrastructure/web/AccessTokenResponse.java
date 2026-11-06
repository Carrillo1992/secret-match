package com.secretmatch.identity.infrastructure.web;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;

/**
 * @param accessToken sent as {@code Authorization: Bearer}; the SPA keeps it in memory only
 * @param expiresAt when to refresh it, at the latest
 */
record AccessTokenResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String accessToken,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) Instant expiresAt) {

    @Override
    public String toString() {
        return "AccessTokenResponse[redacted]";
    }
}
