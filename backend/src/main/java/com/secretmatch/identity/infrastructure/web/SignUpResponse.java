package com.secretmatch.identity.infrastructure.web;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.UUID;

/**
 * @param signUpId lets the visitor ask for a new link; for an email that already has an account it is a
 *     random id that matches nothing, so the answer looks the same
 */
record SignUpResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) UUID signUpId) {}
