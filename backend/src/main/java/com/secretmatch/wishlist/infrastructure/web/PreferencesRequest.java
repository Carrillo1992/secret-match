package com.secretmatch.wishlist.infrastructure.web;

import com.secretmatch.wishlist.domain.Preferences;
import io.swagger.v3.oas.annotations.media.Schema;

/** Only the domain checks the length (422), so the frontend gets one error kind for it. */
record PreferencesRequest(
        @Schema(
                description = "Tastes, sizes and hobbies, up to " + Preferences.MAX_LENGTH
                        + " characters. Blank or left out clears them.")
        String preferences) {

    Preferences toPreferences() {
        return new Preferences(preferences);
    }
}
