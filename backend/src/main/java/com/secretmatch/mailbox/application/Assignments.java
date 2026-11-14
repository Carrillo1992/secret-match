package com.secretmatch.mailbox.application;

import com.secretmatch.mailbox.domain.MemberId;
import java.util.Optional;
import java.util.UUID;

/**
 * Port to the Draw module: the two Assignments a Member is part of, so each gets its Mailbox. What {@link #giverOf}
 * answers only routes Messages: it is never shown to anyone, logged or put in an error (ADR 0001).
 */
public interface Assignments {

    /** The Member's Receiver; empty if the Group has no Draw or {@code member} is not one of its Members. */
    Optional<MemberId> receiverOf(UUID groupId, MemberId member);

    /** The Member's Giver; empty if the Group has no Draw or {@code member} is not one of its Members. */
    Optional<MemberId> giverOf(UUID groupId, MemberId member);
}
