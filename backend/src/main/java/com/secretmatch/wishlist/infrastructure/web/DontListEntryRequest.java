package com.secretmatch.wishlist.infrastructure.web;

import com.secretmatch.wishlist.domain.DontListEntry;
import io.swagger.v3.oas.annotations.media.Schema;

/** Only the domain checks the text (422), so an empty or too long entry is one error kind for the frontend. */
record DontListEntryRequest(
        @Schema(
                requiredMode = Schema.RequiredMode.REQUIRED,
                description = "What the Member does not want, 1 to " + DontListEntry.MAX_LENGTH + " characters.")
        String text) {

    DontListEntry toEntry() {
        return new DontListEntry(text);
    }
}
