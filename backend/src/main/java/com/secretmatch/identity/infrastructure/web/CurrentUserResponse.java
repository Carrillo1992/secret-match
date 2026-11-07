package com.secretmatch.identity.infrastructure.web;

import com.secretmatch.identity.application.CurrentUser;
import io.swagger.v3.oas.annotations.media.Schema;

record CurrentUserResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String email,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String displayName,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) boolean hasPassword) {

    static CurrentUserResponse of(CurrentUser user) {
        return new CurrentUserResponse(user.email(), user.displayName(), user.hasPassword());
    }

    @Override
    public String toString() {
        return "CurrentUserResponse[redacted]";
    }
}
