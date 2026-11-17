package com.secretmatch.notification.infrastructure.web;

import com.secretmatch.notification.domain.PushSubscription;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** A browser's push subscription, shaped like {@code PushSubscription.toJSON()}. */
record PushSubscriptionRequest(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) @NotBlank @Size(max = PushSubscription.MAX_ENDPOINT_LENGTH)
        String endpoint,

        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) @NotNull @Valid
        Keys keys) {

    record Keys(
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) @NotBlank @Size(max = 100)
            String p256dh,

            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) @NotBlank @Size(max = 50)
            String auth) {

        @Override
        public String toString() {
            return "Keys[redacted]";
        }
    }

    @Override
    public String toString() {
        return "PushSubscriptionRequest[redacted]";
    }
}
