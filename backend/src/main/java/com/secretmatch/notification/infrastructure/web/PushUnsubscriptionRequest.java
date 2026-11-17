package com.secretmatch.notification.infrastructure.web;

import com.secretmatch.notification.domain.PushSubscription;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** The endpoint of the push subscription to forget. */
record PushUnsubscriptionRequest(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) @NotBlank @Size(max = PushSubscription.MAX_ENDPOINT_LENGTH)
        String endpoint) {

    @Override
    public String toString() {
        return "PushUnsubscriptionRequest[redacted]";
    }
}
