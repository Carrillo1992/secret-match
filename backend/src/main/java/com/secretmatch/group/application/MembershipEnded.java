package com.secretmatch.group.application;

import java.util.Objects;
import java.util.UUID;

/**
 * A User stopped being a Member of a Group: they left it or the Admin removed them. Published inside the
 * transaction that ends the membership; this is where other modules delete what that Member had in the
 * Group (the Draw module their Exclusions, the Wishlist module their Wishlist).
 *
 * <p>Listen with a plain {@code @EventListener}: it runs inside that same transaction, so the membership and
 * the Member's data go together. A listener that throws undoes the whole leave or removal.
 *
 * @param groupId the Group they are no longer in
 * @param memberId the id of the User who was the Member
 */
public record MembershipEnded(UUID groupId, UUID memberId) {

    public MembershipEnded {
        Objects.requireNonNull(groupId, "groupId");
        Objects.requireNonNull(memberId, "memberId");
    }
}
