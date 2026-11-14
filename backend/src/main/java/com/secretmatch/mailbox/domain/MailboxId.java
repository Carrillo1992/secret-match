package com.secretmatch.mailbox.domain;

import java.util.Objects;
import java.util.UUID;

/** Identifies a Mailbox. Random, so it says nothing about the Giver or Receiver in it. */
public record MailboxId(UUID value) {

    public MailboxId {
        Objects.requireNonNull(value, "value");
    }
}
