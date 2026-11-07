package com.secretmatch.draw.application;

import com.secretmatch.draw.domain.Exclusion;
import com.secretmatch.draw.domain.MemberId;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Port to where each Group's Exclusions are stored. */
public interface Exclusions {

    /** The Group's Exclusions, oldest first. */
    List<StoredExclusion> inGroup(UUID groupId);

    /**
     * Stores the Exclusion in the Group, unless it is there already. Safe when the same Exclusion is added twice
     * at once: only one is stored.
     *
     * @return the stored Exclusion: the new one, or the one that was there
     */
    StoredExclusion add(UUID groupId, Exclusion exclusion, Instant createdAt);

    /** @return whether the Group had that Exclusion */
    boolean remove(UUID groupId, UUID exclusionId);

    /** Deletes every Exclusion of this Member in the Group. */
    void removeAllOf(UUID groupId, MemberId member);

    /** Deletes every Exclusion in the Group. */
    void removeAllIn(UUID groupId);
}
