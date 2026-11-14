package com.secretmatch.wishlist.infrastructure.web;

import com.secretmatch.wishlist.application.StoredDontListEntry;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.UUID;

record DontListEntryResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Identifies the entry, to remove it.")
        UUID id,

        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String text) {

    static DontListEntryResponse of(StoredDontListEntry stored) {
        return new DontListEntryResponse(stored.id(), stored.entry().text());
    }
}
