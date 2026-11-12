package com.secretmatch.draw.infrastructure.web;

import com.secretmatch.draw.application.MyReceiver;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.UUID;

/** The Draw as the signed-in Member sees it: only their own Receiver, never anyone else's (ADR 0001). */
record DrawResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Who the signed-in Member gives a gift to.")
        ReceiverResponse myReceiver) {

    static DrawResponse of(MyReceiver receiver) {
        return new DrawResponse(new ReceiverResponse(receiver.id(), receiver.displayName()));
    }

    record ReceiverResponse(
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Identifies the Member in the Group.")
            UUID id,

            @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
            String displayName) {}
}
