package com.secretmatch.group.infrastructure.web;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.UUID;

record MembershipResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) UUID groupId) {}
