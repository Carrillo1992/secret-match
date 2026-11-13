package com.secretmatch.identity.application;

import java.util.Objects;
import java.util.UUID;

/**
 * A User asked to delete their account. Published inside the deletion's transaction, before anything is deleted:
 * this is where another module refuses the deletion, by throwing a {@link com.secretmatch.shared.domain.DomainException}
 * whose message tells the User why (the Draw module, while they are in a Group whose Draw is made and whose Exchange
 * Date has not passed). A listener here only checks; it changes nothing. If none refuses, {@link UserDeleted}
 * follows.
 *
 * <p>Listen with a plain {@code @EventListener}, so a refusal undoes the whole deletion.
 *
 * @param userId the User who wants to go
 */
public record UserDeletionRequested(UUID userId) {

    public UserDeletionRequested {
        Objects.requireNonNull(userId, "userId");
    }
}
