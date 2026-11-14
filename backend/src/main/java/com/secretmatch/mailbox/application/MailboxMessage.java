package com.secretmatch.mailbox.application;

import com.secretmatch.mailbox.domain.MessageText;
import java.time.LocalDate;
import java.util.Objects;

/**
 * A Message as either side of its Mailbox sees it: whether they wrote it, what it says and only the date it was
 * sent, in UTC, never the time (ADR 0001).
 */
public record MailboxMessage(boolean mine, MessageText text, LocalDate sentOn) {

    public MailboxMessage {
        Objects.requireNonNull(text, "text");
        Objects.requireNonNull(sentOn, "sentOn");
    }
}
