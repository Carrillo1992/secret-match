package com.secretmatch.group.application;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * What a Member sees of their Group. {@code budget} is {@code null} when the Group has none; the Admin comes
 * first among the Members, the rest in the order they joined. {@code inviteCode} is the code of its Invite
 * Link, and {@code admin} says whether the Member looking is its Admin.
 */
public record GroupDetails(
        UUID id,
        String name,
        LocalDate exchangeDate,
        BigDecimal budget,
        List<Member> members,
        String inviteCode,
        boolean admin) {

    public GroupDetails {
        members = List.copyOf(members);
    }

    /** {@code id} is the id of the User the Member is. */
    public record Member(UUID id, String displayName, boolean admin) {}
}
