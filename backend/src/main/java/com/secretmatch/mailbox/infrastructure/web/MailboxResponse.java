package com.secretmatch.mailbox.infrastructure.web;

import com.secretmatch.mailbox.application.MyMailbox;
import com.secretmatch.mailbox.domain.Side;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.UUID;

/** One of the signed-in Member's Mailboxes. Nothing in it says anything about their Giver (ADR 0001). */
record MailboxResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Opaque: says nothing about who is in it.")
        UUID id,

        @Schema(
                requiredMode = Schema.RequiredMode.REQUIRED,
                description = "The signed-in Member's own side: GIVER in the Mailbox with their Receiver, RECEIVER"
                        + " in the one with their Giver.")
        Side side,

        @Schema(
                requiredMode = Schema.RequiredMode.REQUIRED,
                types = {"string", "null"},
                description = "The Receiver's display name when side is GIVER; null when side is RECEIVER: the Giver"
                        + " is never named.")
        String receiverDisplayName) {

    static MailboxResponse of(MyMailbox mailbox) {
        return switch (mailbox) {
            case MyMailbox.WithMyReceiver withReceiver ->
                new MailboxResponse(withReceiver.id().value(), Side.GIVER, withReceiver.receiverDisplayName());
            case MyMailbox.WithMyGiver withGiver ->
                new MailboxResponse(withGiver.id().value(), Side.RECEIVER, null);
        };
    }
}
