package com.secretmatch.mailbox.infrastructure.web;

import com.secretmatch.mailbox.domain.MessageText;
import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Not validated here: an empty, blank or too long text is the domain's {@code invalid-message} (422), and only
 * after checking that the Mailbox is the signed-in Member's.
 */
record SendMessageRequest(
        @Schema(
                requiredMode = Schema.RequiredMode.REQUIRED,
                minLength = 1,
                maxLength = MessageText.MAX_LENGTH,
                description = "Text only, kept as written; not blank.")
        String text) {}
