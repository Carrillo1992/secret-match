package com.secretmatch.notification.infrastructure.web;

import io.swagger.v3.oas.annotations.media.Schema;

/** @param publicKey the VAPID public key, base64url: the {@code applicationServerKey} of a subscription */
record PushPublicKeyResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String publicKey) {}
