package com.secretmatch.wishlist.application;

import java.util.List;

/**
 * A Group as the Wishlist module reads it from the Groups module.
 *
 * @param members its Members
 * @param currency the ISO 4217 code of the money its Wish prices are in: {@code EUR} or {@code USD}
 * @param finished whether its Exchange Date is over, which makes every Wishlist in it read-only
 */
public record Roster(List<GroupMember> members, String currency, boolean finished) {

    public Roster {
        members = List.copyOf(members);
    }
}
