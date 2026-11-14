package com.secretmatch.draw.application;

import java.util.Objects;
import java.util.UUID;

/**
 * The Admin cancelled a Group's Draw. Published inside the transaction that deletes its Assignments; this is where
 * other modules discard what only made sense for that Draw. The Mailbox spec (#5) deletes the Group's Mailboxes
 * here, so no message between a former Giver and Receiver survives the Draw they belonged to.
 *
 * <p>Listen with a plain {@code @EventListener}: it runs inside that same transaction, so the Draw and everything
 * tied to it go together. A listener that throws undoes the whole cancellation.
 *
 * <p>It names nobody: who gave to whom is gone with the Assignments (ADR 0001).
 *
 * @param groupId the Group whose Draw no longer exists
 */
public record DrawCancelled(UUID groupId) {

    public DrawCancelled {
        Objects.requireNonNull(groupId, "groupId");
    }
}
