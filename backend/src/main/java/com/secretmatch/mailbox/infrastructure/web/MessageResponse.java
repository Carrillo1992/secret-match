package com.secretmatch.mailbox.infrastructure.web;

import com.secretmatch.mailbox.application.MailboxMessage;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDate;

/** A Message as either side sees it: no id, no author, no time of day (ADR 0001). */
record MessageResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Whether the signed-in Member wrote it.")
        boolean mine,

        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String text,

        @Schema(
                requiredMode = Schema.RequiredMode.REQUIRED,
                description = "The day it was sent, in UTC; never the time.")
        LocalDate sentOn) {

    static MessageResponse of(MailboxMessage message) {
        return new MessageResponse(message.mine(), message.text().value(), message.sentOn());
    }
}
