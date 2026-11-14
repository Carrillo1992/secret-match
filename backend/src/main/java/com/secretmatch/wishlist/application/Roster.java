package com.secretmatch.wishlist.application;

import java.util.List;

/**
 * A Group as the Wishlist module reads it from the Groups module.
 *
 * @param members its Members
 * @param finished whether its Exchange Date is over, which makes every Wishlist in it read-only
 */
public record Roster(List<GroupMember> members, boolean finished) {

    public Roster {
        members = List.copyOf(members);
    }
}
