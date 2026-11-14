package com.secretmatch.mailbox.domain;

import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

/**
 * The conversation of one Assignment, between its Giver and its Receiver; nobody else is in it. Who the Giver is
 * never leaves the Mailbox module (ADR 0001).
 */
public record Mailbox(MailboxId id, UUID groupId, MemberId giver, MemberId receiver) {

    public Mailbox {
        Objects.requireNonNull(id, "id");
        Objects.requireNonNull(groupId, "groupId");
        Objects.requireNonNull(giver, "giver");
        Objects.requireNonNull(receiver, "receiver");
    }

    /** The side {@code member} is on; empty if they are not in this Mailbox. */
    public Optional<Side> sideOf(MemberId member) {
        if (member.equals(giver)) {
            return Optional.of(Side.GIVER);
        }
        if (member.equals(receiver)) {
            return Optional.of(Side.RECEIVER);
        }
        return Optional.empty();
    }
}
