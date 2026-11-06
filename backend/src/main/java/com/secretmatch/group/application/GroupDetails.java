package com.secretmatch.group.application;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * What a Member sees of their Group. {@code budget} is {@code null} when the Group has none; the Admin comes
 * first among the Members, the rest in the order they joined.
 */
public record GroupDetails(UUID id, String name, LocalDate exchangeDate, BigDecimal budget, List<Member> members) {

    public GroupDetails {
        members = List.copyOf(members);
    }

    public record Member(String displayName, boolean admin) {}
}
