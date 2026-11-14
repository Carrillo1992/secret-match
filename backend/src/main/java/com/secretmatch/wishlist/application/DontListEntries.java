package com.secretmatch.wishlist.application;

import com.secretmatch.wishlist.domain.DontListEntry;
import com.secretmatch.wishlist.domain.MemberId;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** Port to where each Member's Don't List entries in each Group are stored. */
public interface DontListEntries {

    /** The Member's Don't List in the Group, oldest first. */
    List<StoredDontListEntry> of(UUID groupId, MemberId owner);

    /** The Group's Don't List entry with that id, whoever owns it. */
    Optional<StoredDontListEntry> find(UUID groupId, UUID entryId);

    StoredDontListEntry add(UUID groupId, MemberId owner, DontListEntry entry, Instant createdAt);

    void remove(UUID groupId, UUID entryId);

    /** Deletes every Don't List entry of this Member in the Group. */
    void removeAllOf(UUID groupId, MemberId owner);

    /** Deletes every Don't List entry in the Group. */
    void removeAllIn(UUID groupId);
}
