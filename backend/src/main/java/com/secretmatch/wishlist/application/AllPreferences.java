package com.secretmatch.wishlist.application;

import com.secretmatch.wishlist.domain.MemberId;
import com.secretmatch.wishlist.domain.Preferences;
import java.util.UUID;

/** Port to where each Member's Preferences in each Group are stored. */
public interface AllPreferences {

    /** The Member's Preferences in the Group, or {@link Preferences#NONE} if they wrote none. */
    Preferences of(UUID groupId, MemberId owner);

    /** Replaces the Member's Preferences in the Group; {@link Preferences#NONE} clears them. */
    void save(UUID groupId, MemberId owner, Preferences preferences);

    /** Deletes this Member's Preferences in the Group. */
    void removeAllOf(UUID groupId, MemberId owner);

    /** Deletes every Member's Preferences in the Group. */
    void removeAllIn(UUID groupId);
}
