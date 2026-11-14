package com.secretmatch.mailbox.application;

import com.secretmatch.mailbox.domain.MemberId;
import com.secretmatch.mailbox.domain.MessageText;
import java.time.Instant;
import java.util.Objects;

/** A Message as it is stored. Its author and exact time never leave the Mailbox module. */
public record StoredMessage(MemberId author, MessageText text, Instant sentAt) {

    public StoredMessage {
        Objects.requireNonNull(author, "author");
        Objects.requireNonNull(text, "text");
        Objects.requireNonNull(sentAt, "sentAt");
    }
}
