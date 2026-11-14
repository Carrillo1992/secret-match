package com.secretmatch.wishlist.application;

import com.secretmatch.wishlist.domain.MemberId;
import java.util.Objects;

/** A Member of a Group, as the Wishlist module reads them from the Groups module. */
public record GroupMember(MemberId id, String displayName) {

    public GroupMember {
        Objects.requireNonNull(id, "id");
        Objects.requireNonNull(displayName, "displayName");
    }
}
