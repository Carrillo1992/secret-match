package com.secretmatch.wishlist.infrastructure.web;

import com.secretmatch.wishlist.domain.Preferences;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Size;

/** Mirrors the domain's length rule so a mistake is a 400. */
record PreferencesRequest(
        @Schema(description = "Tastes, sizes and hobbies. Blank or left out clears them.")
        @Size(max = Preferences.MAX_LENGTH)
        String preferences) {

    Preferences toPreferences() {
        return new Preferences(preferences);
    }
}
