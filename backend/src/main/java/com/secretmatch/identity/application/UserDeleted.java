package com.secretmatch.identity.application;

import java.util.Objects;
import java.util.UUID;

/**
 * A User is deleting their account and nobody refused it ({@link UserDeletionRequested}). Published inside the
 * deletion's transaction, before the User's row goes, so rows that point at it can still be deleted: this is where
 * other modules delete everything they keep for that User (the Groups module deletes the Groups they are the Admin
 * of and ends their other memberships; the Draw module deletes their Assignments).
 *
 * <p>Listen with a plain {@code @EventListener}: it runs inside that same transaction, so the User and their data go
 * together. A listener that throws undoes the whole deletion.
 *
 * @param userId the User who no longer exists
 */
public record UserDeleted(UUID userId) {

    public UserDeleted {
        Objects.requireNonNull(userId, "userId");
    }
}
