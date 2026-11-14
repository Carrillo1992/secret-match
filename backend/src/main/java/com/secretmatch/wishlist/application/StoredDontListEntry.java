package com.secretmatch.wishlist.application;

import com.secretmatch.wishlist.domain.DontListEntry;
import com.secretmatch.wishlist.domain.MemberId;
import java.util.Objects;
import java.util.UUID;

/** An entry kept on a Member's Don't List, with the id its owner removes it by. */
public record StoredDontListEntry(UUID id, MemberId owner, DontListEntry entry) {

    public StoredDontListEntry {
        Objects.requireNonNull(id, "id");
        Objects.requireNonNull(owner, "owner");
        Objects.requireNonNull(entry, "entry");
    }
}
