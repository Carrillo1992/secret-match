package com.secretmatch.wishlist.infrastructure.web;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.secretmatch.wishlist.domain.Preferences;
import io.swagger.v3.oas.annotations.media.Schema;

/** Left out when the Member wrote none. */
@JsonInclude(JsonInclude.Include.NON_NULL)
record PreferencesResponse(
        @Schema(description = "Left out when there are none.")
        String preferences) {

    static PreferencesResponse of(Preferences preferences) {
        return new PreferencesResponse(preferences.text());
    }
}
