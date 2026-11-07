package com.secretmatch.group.application;

import java.util.Objects;
import java.util.UUID;

/**
 * The Admin deleted a Group. Published inside the transaction that deletes it, before the Group's rows go, so
 * rows that point at it can still be deleted; this is where other modules delete everything they keep in that
 * Group (Exclusions, the Draw, Wishlists, Mailboxes).
 *
 * <p>Listen with a plain {@code @EventListener}: it runs inside that same transaction, so the Group and its
 * data go together. A listener that throws undoes the whole deletion.
 *
 * @param groupId the Group that no longer exists
 */
public record GroupDeleted(UUID groupId) {

    public GroupDeleted {
        Objects.requireNonNull(groupId, "groupId");
    }
}
